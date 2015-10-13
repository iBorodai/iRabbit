"use strict";

var EventEmitter = require( "events" ).EventEmitter
  , amqp = require('amqplib')
  , util = require('util')
  , assert = require( 'assert' )
  , _ = require( 'underscore' )
  , Q = require('q');


function iRabbit( config, hashCode ) {
    assert.equal(typeof (config), 'object',    "config object expected");
    assert.equal(typeof (config.connection), 'object',    "config.connection object expected");
    assert.equal(typeof (config.connection.url), 'string',    "config.connection.url string expected");

    EventEmitter.call(this);
    this._config = config;
    this._hashCode = hashCode;
    this._connectionP = false;
    this._enity = {};
    // this._queues = {};

    this.amqp = amqp;
    this.connection = false;
}

util.inherits(iRabbit, EventEmitter);

var singleton = {};
/**
 * Синглтоню модуль по объекту конфигурации
 * @param  {object} config конфигурация
 * @return {object}        экземпляр класса iRabbit
 */
module.exports = function Singleton( config ){
    var hashCode = makeHash( config );
    if (singleton[hashCode]) return singleton[hashCode];
    if (!(this instanceof iRabbit))
        return singleton[hashCode] = new iRabbit(config, hashCode);
};

//Соединение
iRabbit.prototype.connect = function() {
    var hashCode = 'connection'+makeHash(this._config.connection);

    if( typeof(this._enity[hashCode])=='undefined' || !this._enity[hashCode] ){
        var url = this._config.connection.url;
        var opts = this._config.connection; //delete opts.url;
        this._enity[hashCode] = amqp.connect( url, opts );
        this._enity[hashCode] . then(
            function onConnect( connection ){
                this.connection = connection;
            }.bind(this)
        );
    }
    return this._enity[hashCode];
}

/**
 * Создание канала. Само по себе создание каналы смысла не имеет.
 * Канал создается для какой-то очереди или темы по этому метод принимает параметры идентифицирующие сущность для которой создается канал.
 * @param  {string} forEntityType тип сущности [queue|exchange]
 * @param  {string} forEntityName имя сущности
 * @param  {boolean} confirmChannel optional if true - creates ConfirmChannel (default - false) http://www.squaremobius.net/amqp.node/channel_api.html#model_createConfirmChannel
 * @return {[type]}               Промис
 */
iRabbit.prototype.channel = function( forEntityType, forEntityName, confirmChannel ) {

    confirmChannel = ( typeof(confirmChannel) == 'undefined' ) ? false : true ;

    return this.connect().then(function connected( connection ){


        var hashCode = 'channel'+makeHash( (forEntityType.toString())+(forEntityName.toString())+(confirmChannel.toString()) );
        if( typeof(this._enity[hashCode])=='undefined' || !this._enity[hashCode] ){
            if( confirmChannel ){
                this._enity[hashCode] = this.connection.createConfirmChannel(channel);
            } else {
                this._enity[hashCode] = this.connection.createChannel();
            }
        }

        return this._enity[hashCode];
    }.bind(this));
}

/*************************
 *          Queue
 *************************/

/**
 * init queue
 * @param  {[type]} name    [description]
 * @param  {[type]} options [description]
 * @return {[type]}         promice
 */
iRabbit.prototype.initQueue = function( name, options ){
    //apply default options
    var defOptions = {
        'durable':false,
        'exclusive':false,
        'autoDelete':true
    };

    if( typeof(options) == 'undefined' ) options = defOptions;
    else options =  _.extend(defOptions, options);
    // console.log(options); process.exit;

    return this.channel( 'queue', name ).then( function channelInited( channel ){
        var hashCode = 'queue' + name;

        if( typeof(this._enity[hashCode])!='undefined' ) return this._enity[hashCode];

        this._enity[hashCode] = channel.assertQueue( name, options );

        /*this._enity[hashCode].then(function(queue){
            this._queues[ name ] = new iRabbitQueue( this, channel, queue );
            console.log('HERE!', this._queues[ name ] );
        });*/

        return this._enity[hashCode];
    }.bind(this));
}

iRabbit.prototype.subscribeQueue = function( name, options1, oprions2 ){
    assert.equal(typeof (name), 'string',    "name string expected");

    var locChannel = false,
        queueHash = 'queue'+name;

    if( typeof( this._enity[queueHash] )=='undefined' || !this._enity[queueHash] ){
    // Если очередь еще не инициализирована - ожидаются отдельные параметры для инита и подписи

        var initOptions = typeof(options1)!='undefined' ? options1 : {} ;
        var subscribeOptions = typeof(options2)!='undefined' ? options1 : {} ;

        return this.initQueue( name, initOptions ).then(function( queue ){
            this.channel('queue', queue.queue).then(function( channel ){
                return this._consumeQueue(
                    channel,
                    queue,
                    subscribeOptions
                );
            }.bind(this) );
        }.bind(this));

    } else {
    // Очередь инициализирована - ожидаются параметры только для подписи

        var subscribeOptions = typeof(options1)!='undefined' ? options1 : {} ;
        return this.channel('queue', queue.queue).then(function( channel ){
            return this._consumeQueue(
                channel,
                this._enity[queueHash],
                subscribeOptions
            );
        }.bind(this));

    }
}

iRabbit.prototype._consumeQueue = function ( channel, queue, options ){

    var queueName = queue.queue;

    return channel.consume(
        queueName,
        function ConsumeCallback( message ){ // коллбэк ф-я приема сообщений

            var unpackedMessage = this._unpackData( message );

            this.emit( 'receive',{
                'type' : 'queue',
                'name' : queueName,
                'message' : unpackedMessage ,
                'messageObj' : message
            });
            this.emit( queueName+':message', {
                'message' : unpackedMessage ,
                'messageObj' : message
            });

        }.bind(this),
        options
    );
}

iRabbit.prototype.sendQueue = function( name, message , options1, options2 ) {
    assert.notEqual(typeof (message), 'undefined' , "message expected" );
    assert.equal(typeof (name), 'string',    "name string expected");
    if(typeof(options1)=='undefined') options1={};
    if(typeof(options2)=='undefined') options2={};

    var locChannel = false,
        queueHash = 'queue'+name;


    if( typeof( this._enity[queueHash] )=='undefined' || !this._enity[queueHash] ){
    // Если очередь еще не инициализирована - ожидаются отдельные параметры для инита и отправки

        var initOptions = typeof(options1)!='undefined' ? options1 : {} ;
        var sendOptions = typeof(options2)!='undefined' ? options1 : {} ;

        return this.initQueue( name, initOptions ).then(function( queue ){
            this.channel('queue', queue.queue).then(function( channel ){
                locChannel = channel;
                return this._sendQueue(
                    channel,
                    queue,
                    message,
                    sendOptions
                );
            }.bind(this) );
        }.bind(this));

    } else {
    // Очередь инициализирована - ожидаются параметры только для подписи

        var sendOptions = typeof(options1)!='undefined' ? options1 : {} ;
        return this.channel('queue', queue.queue).then(function( channel ){
            locChannel = channel;

            return this._sendQueue(
                channel,
                this._enity[queueHash],
                message,
                sendOptions
            );
        }.bind(this));

    }
}

iRabbit.prototype._sendQueue = function( channel, queue, message, options ){

    var packed = this._packData(message);
    message = packed.data;
    options.contentType = packed.mime;
    options.contentEncoding = 'UTF8';

    var queueName = queue.queue;
    return channel.sendToQueue(queueName, new Buffer(message), options);
}

iRabbit.prototype._packData = function( object ){
    var res = {
        mime : 'text/plain',
        data : ''
    };

    switch ( typeof object ) {
        case 'object' :{
            try{
                res.data = JSON.stringify( object );
                res.mime = 'application/json';
            } catch (e){
                throw new Error('Failed pack data');
            }
            break;
        }
        case 'string':{
            res.data = object;
        }
        default: {
            res.data = object.toString();
        }
    }
    return res;
}

iRabbit.prototype._unpackData = function( messageObj ){
    var result = false;

    switch( messageObj.properties.contentType ){
        case 'application/json':{
            try{
                result = JSON.parse( messageObj.content.toString() );
            } catch ( e ){
                throw new Error('failed unpack data');
            }
            break;
        }
        case 'text/plain':
        default:
            result = messageObj.content.toString();
    }

    return result;
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
    var config = ( typeof(this._config.topic)=='object' ) ? _.extend(this._config.topic, conf) : conf;

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

    var config = ( typeof(this._config.topic)=='object' ) ? _.extend(this._config.topic, conf) : conf;

    assert.equal(typeof (config.routingKey), 'string', "config.routingKey string expected '"+config.routingKey+"'");

    var deferred = Q.defer();
    this.initTopic( conf ).then(
        function onTopicInited(){

            var isExclusive = (typeof(this._config.topic.queueName)=='undefined');

            this.connection.queue(
                isExclusive ? '' : this._config.topic.queueName,
                {
                    exclusive : isExclusive
                },
                function( q ){
                    //normalize as array
                    if(typeof(config.routingKey)=='string') config.routingKey = [config.routingKey];
                    //subscribe all detected keys
                    for( var i in config.routingKey ){
                        q.bind(
                            this._config.topic.exchangeName,
                            config.routingKey[i]
                            /*, function bindCallback(queue){
                                //detect acknowledge params
                                var options = {}
                                if( typeof(this._config.topic.ack)!='undefined' ) options.ack = true;
                                if( typeof(this._config.topic.prefetchCount)!='undefined' ) options.prefetchCount= this._config.topic.prefetchCount;

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
                        if( typeof(this._config.topic.ack)!='undefined' ) options.ack = true;
                        if( typeof(this._config.topic.prefetchCount)!='undefined' ) options.prefetchCount= this._config.topic.prefetchCount;

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


/**
 * Вспомогательная ф-я создания хеш кода из объекта
 */
function makeHash ( obj ) {
    var str = '';
    switch( typeof(obj) ){
        case 'string': str = obj; break;
        case 'object': str = ( JSON.stringify( obj ) ); break;
        case 'undefined': str = ''; break;
    }

    var hash = 0, i, chr, len;

    if (str.length == 0) return hash;

    for (i = 0, len = str.length; i < len; i++) {
        chr   = str.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};


/**
 * iRabbitQueue - подобъект, который возвращается в случае создания очереди или подписывания на очередь.
 * Обоадает функционалом очереди - отправить, подписаться,
 * @param  {[type]} iRabbitObj [description]
 * @param  {[type]} channel    [description]
 * @param  {[type]} queue      [description]
 * @return {[type]}            [description]
 */
/*function iRabbitQueue( iRabbitObj, channel, queue ) {
    if ( !(iRabbitObj instanceof iRabbit) ) throw new Error('Expected iRabbit param type');
    assert.equal(typeof (channel), 'object',    "channel object expected");
    assert.equal(typeof (queue), 'object',    "queue object expected");
    assert.equal(typeof (queue.queue), 'string',    "queue.queue string expected");

    EventEmitter.call(this);
    this._parent = iRabbitObj;
    this._channel = channel;
    this._queue = queue;
}

util.inherits(iRabbitQueue, EventEmitter);*/