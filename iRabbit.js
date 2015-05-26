"use strict";

var EventEmitter = require( "events" ).EventEmitter
  , amqp = require('amqp')
  , util = require('util')
  , assert = require( 'assert' )
  , _ = require( 'underscore' )
  , Q = require('q');


function iRabbit( config ) {
    assert.equal(typeof (config), 'object',    "config object expected");

    EventEmitter.call(this);
    this.config = config;
    this.connection = false;

    this.topics={};
    this.topic={
        exchange : false ,
        countMsg : 0 ,
    };
}
util.inherits(iRabbit, EventEmitter);

//експортирую фабричнуюю ф-ю
module.exports = function( conf ){ return new iRabbit(conf); };

iRabbit.prototype.connect = function() {
    var deferred = Q.defer();

    //deferred.resolve( body );
    //deferred.reject(err);
    if( !this.connection ){

        this.connection = amqp.createConnection( this.config );
        //соеденено
        this.connection.on( 'ready', function(){
            //Соединение с кроликом установлено
            this.emit( 'connected' );
            deferred.resolve( this.connection );
        }.bind(this) );
        //ошибка соединения
        this.connection.on( 'error' , function( err ){
            this.emit( 'error', err );
            deferred.reject(err);
        }.bind(this) );
        //соединение закрыто
        this.connection.on( 'close' , function(){
            this.emit( 'close' );
        }.bind(this) );
    } else {

        deferred.resolve(this.connection);
    }

    //а вот и промис
    return deferred.promise;
}

/**
 * DIRECT
 */
iRabbit.prototype.initAndSubscribeQueue = function( qName, options ) {
    var deferred = Q.defer();

    this.connect().then(
        function onConnect(){

            if(typeof(qName)=='undefined') qName='';
            if(typeof(options)=='undefined') options={init:{}, subscribe:{}};
            else{
                if(typeof(options.init)=='undefined') options.init={};
                if(typeof(options.subscribe)=='undefined') options.subscribe={};
            }

            this.connection.queue(
                qName,
                options.init,
                function( q ) {
                    //console.log(' [i] Queue '+q.name+' declared');
                    q.subscribe(
                        options.subscribe,
                        function( message, headers, deliveryInfo, messageObj ) {
                            this.emit('queue.pull',message, headers, deliveryInfo, messageObj, q);
                        }.bind(this)
                    ).once(
                        'error',
                        function(error) {
                            this.emit('queue.error', error );
                            deferred.reject( error );
                        }.bind(this)
                    ).addCallback(
                        function subscribed(ok){
                            //console.log(' [i] subscribed '+q.name);
                            this.emit('queue.subscribed', q );
                            deferred.resolve(q);
                        }.bind(this)
                    );
                }.bind(this)
            );
        }.bind(this)
    );

    return deferred.promise;
}

iRabbit.prototype.pushQueue = function( qName, message , options ) {
    assert.notEqual(typeof (message), 'undefined' , "message expected" );
    assert.equal(typeof (qName), 'string',    "qName string expected");
    if(typeof(options)=='undefined') options={};

    this.connect().then(
        function onConnect(){

            this.connection.publish(
                qName,
                message,
                options
            );

        }.bind(this)
    );
}

/**
 * TOPIC
 */

/**
 * inits topic exchange
 * @param  object conf config object for topic only
 * @return promise witch resolves when exchange ready
 * @emit topic.ready event with <exchange> param,
 *       topic.error event with <error> param
 */
iRabbit.prototype.initTopic = function( conf ) {
    var config = ( typeof(this.config.topic)=='object' ) ? _.extend(this.config.topic, conf) : conf;

    assert.equal(typeof (config.exchangeName), 'string',    "config.exchangeName string expected");
    //assert.equal(typeof (config.routingKey), 'string',    "config.routingKey string expected");

    var deferred = Q.defer();

    //if already inited
    if( this.topics[ config.exchangeName ] ){
        deferred.resolve( this.topics[ config.exchangeName ] );
        return deferred.promise;
    }

    //init topicExchange as usual
    this.connect().then(
        function onConnect(){
            this.topic.exchange = this.connection.exchange(
                config.exchangeName,
                {
                    type:'topic',
                    confirm:true
                },
                function exchangeOpenCallback(exchange){
                    if(!exchange){
                        deferred.reject( err );
                        this.emit('topic.error', err );
                    }else{
                        this.topics[ this.topic.exchange.name ] = this.topic.exchange;
                        deferred.resolve( this.topic.exchange );
                        this.emit('topic.ready', this.topic.exchange );
                    }
                }.bind(this)
            );

            /*
            //This interface is considered deprecated. https://github.com/postwait/node-amqp#exchangeonopen-callback
            this.topic.exchange.on('error', function onError(err){
                deferred.reject( err );
                this.emit('topic.error', err );
            }.bind(this));

            this.topic.exchange.on('open', function onOpen(){
                this.topics[ this.topic.exchange.name ] = this.topic.exchange;
                deferred.resolve( this.topic.exchange );
                this.emit('topic.ready', this.topic.exchange );
            }.bind(this));*/

        }.bind(this)
    );

    return deferred.promise;
}

iRabbit.prototype.topicPush = function( message, publishKey, options ) {
    assert.notEqual(typeof (message), 'undefined' , "message expected" );
    assert.equal(typeof (publishKey), 'string', "publishKey string expected");

    var deferred = Q.defer();

    this.initTopic().then(
        function onTopicInited( exchange ){

            var opts=(typeof(options)!='undefined') ? options : {};
            //Before publish - changes in message, publishKey, options
            if( typeof(options.beforePublish)=='function' ){

                var tObj={ message:message, publishKey: publishKey, options: options }

                var resObj = options.beforePublish( tObj );
                if( typeof(resObj)=='object' )  tObj = _.extend(tObj, resObj);

                message = tObj.message; publishKey = tObj.publishKey; options = tObj.options;

                delete options.beforePublish;
                //delete tObj;
            }

            exchange.publish(
                publishKey,
                message,
                opts,
                function onPub(prm){
                    this.emit('topic.push', message, publishKey);
                    deferred.resolve({
                        message:message,
                        publishKey:publishKey
                    });
                }.bind(this)
            );

        }.bind(this)
    ).catch(function(err){
        console.log(err);
    });

    return deferred.promise;
}

iRabbit.prototype.topicSubscribe = function( conf ){

    var config = ( typeof(this.config.topic)=='object' ) ? _.extend(this.config.topic, conf) : conf;

    assert.equal(typeof (config.routingKey), 'string', "config.routingKey string expected '"+config.routingKey+"'");

    var deferred = Q.defer();
    this.initTopic( conf ).then(
        function onTopicInited(){

            var isExclusive = (typeof(this.config.topic.queueName)=='undefined');

            this.connection.queue(
                isExclusive ? '' : this.config.topic.queueName,
                {
                    exclusive : isExclusive
                },
                function( q ){
                    //normalize as array
                    if(typeof(config.routingKey)=='string') config.routingKey = [config.routingKey];
                    //subscribe all detected keys
                    for( var i in config.routingKey ){
                        q.bind(
                            this.config.topic.exchangeName,
                            config.routingKey[i]
                            /*, function bindCallback(queue){
                                //detect acknowledge params
                                var options = {}
                                if( typeof(this.config.topic.ack)!='undefined' ) options.ack = true;
                                if( typeof(this.config.topic.prefetchCount)!='undefined' ) options.prefetchCount= this.config.topic.prefetchCount;

                                q.subscribe(
                                    options,
                                    function( message, headers, deliveryInfo, messageObj ){
                                        this.emit('topic.pull', message, headers, deliveryInfo, messageObj );
                                    }.bind(this)
                                ).once('error', function(error) {
                                    console.log(error);
                                }).once('basicQosOk', function() {
                                    //it is supposed it is emmited when subscription is ready, but...
                                    //it seems is not working :(
                                }).addCallback(function subscribed(ok){
                                    //logger.info("Great, subscription done it");
                                    deferred.resolve( q );
                                });
                            }.bind(this)*/
                        );
                    }
                    //q.on('error',function(e){ console.log('[x]queueError:',e); });
                    q.on('queueBindOk',function(){
                        //detect acknowledge params
                        var options = {}
                        if( typeof(this.config.topic.ack)!='undefined' ) options.ack = true;
                        if( typeof(this.config.topic.prefetchCount)!='undefined' ) options.prefetchCount= this.config.topic.prefetchCount;

                        q.subscribe(
                            options,
                            function( message, headers, deliveryInfo, messageObj ){
                                this.emit('topic.pull', message, headers, deliveryInfo, messageObj );
                            }.bind(this)
                        ).once('error', function(error) {
                            console.log(error);
                        }).once('basicQosOk', function() {
                            //it is supposed it is emmited when subscription is ready, but...
                            //it seems is not working :(
                        }).addCallback(function subscribed(ok){
                            //logger.info("Great, subscription done it");
                            deferred.resolve( {
                                queue:q,
                                routingKey:config.routingKey
                            } );
                        });

                    }.bind(this));
                    //onConsumerCancel
                    //q.on('basicCancel',function(){ this.emit('') }.bind(this));
                    //onSubscribed
                }.bind(this)
            )
        }.bind(this)
    );
    return deferred.promise;
}