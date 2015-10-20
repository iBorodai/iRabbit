"use strict";

var EventEmitter = require( "events" ).EventEmitter
  , amqp = require('amqplib')
  , util = require('util')
  , assert = require( 'assert' )
  , _ = require( 'underscore' )
  // , when = require('./node_modules/amqplib/node_modules/when') // --- just test require sub module - BUT!!! may be should use "when.js" instead of "Q"
  , Q = require('q')
  , uuid = require('node-uuid');

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
    this._channel = false;
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
                process.once('SIGINT', function() { connection.close(); });
                return this.connection;
            }.bind(this)
        ) . catch( function( err ){
            return Q.reject(err);
        });
    }
    return this._enity[hashCode];
}

/**
 * UPDATE:
 *    > переделано - всегда выдается один канал.
 *    > Не вижу конфликта, т.к. канал - виртуальное соединение внутри реального ( http://stackoverflow.com/questions/18418936/rabbitmq-and-relationship-between-channel-and-connection )
 *
 * Создание канала. Само по себе создание каналы смысла не имеет.
 * Канал создается для какой-то очереди или темы по этому метод принимает параметры идентифицирующие сущность для которой создается канал.
 * @param  {string} forEntityType тип сущности [queue|exchange]
 * @param  {string} forEntityName имя сущности
 * @param  {boolean} confirmChannel optional if true - creates ConfirmChannel (default - false) http://www.squaremobius.net/amqp.node/channel_api.html#model_createConfirmChannel
 * @return {[type]}               Промис
 */
iRabbit.prototype.channel = function( forEntityType, forEntityName, confirmChannel ) {
    // console.log('channel called');
    if( arguments.length == 1 && typeof(forEntityType) == 'boolean' ){
        confirmChannel = forEntityType;
    }
    forEntityType = ( typeof(forEntityType) != 'undefined' ) ? forEntityType : '';
    forEntityName = ( typeof(forEntityName) != 'undefined' ) ? forEntityName : '';
    confirmChannel = ( typeof(confirmChannel) == 'undefined' ) ? false : true ;

    return this.connect().then(function connected( connection ){

            // var hashCode = 'channel'+makeHash( (forEntityType.toString())+(forEntityName.toString())+(confirmChannel.toString()) );
            var hashCode = 'channel'; //Потому что не вижу конфликта в использовании одного канала одновременно для очередей и эксченджей

            if( typeof(this._enity[hashCode])=='undefined' || !this._enity[hashCode] ){
                if( confirmChannel ){
                    this._enity[hashCode] = this.connection.createConfirmChannel(channel);
                } else {
                    this._enity[hashCode] = this.connection.createChannel();
                }

                this._enity[hashCode].then(function(channel){
                    this._channel = channel;
                    // console.log('channel',this._channel);
                }.bind(this));
            }

            return this._enity[hashCode];
        }.bind(this)
    ) . catch( function( err ){ return Q.reject(err); } );
}

/*************************
 *          Queue
 *************************/

/**
 * init queue
 * @param  {string} name    name for queue, may be empty string
 * @param  {object} options init queue options
 * @return {promise}        promice that resolves as amqplib queue object
 */
iRabbit.prototype.initQueue = function( name, options ){
    assert.equal(typeof (name), 'string',    "name string expected");

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

            return this._enity[hashCode];
        }.bind(this)
    ) . catch( function(err){ return Q.reject(err); } );
}

/**
 * consume existing queue or if it wasnt inited before creates one and consume it
 * @param  {string} name     queue name
 * @param  {object} options1 if queue exists - consume options, otherwise - init queue options
 * @param  {object} options2 if queue exists - not expected, otherwise - consume options
 * @return {promise}         returns promise that resolves as object with "queue" and "consume" fields - results of init queue and consume it
 */
iRabbit.prototype.subscribeQueue = function( name, options1, options2 ){
    assert.equal(typeof (name), 'string',    "name string expected");

    var locChannel = false,
        queueHash = 'queue'+name;
        // console.log(queueHash, this._enity[queueHash]);
    if( typeof( this._enity[queueHash] )=='undefined' || !this._enity[queueHash] ){

        // Если очередь еще не инициализирована - ожидаются отдельные параметры для инита и подписи

        var initOptions = typeof(options1)!='undefined' ? options1 : {} ;
        var subscribeOptions = typeof(options2)!='undefined' ? options2 : {} ;

        return this.initQueue( name, initOptions ).then(function( queue ){
            return this._consumeQueue( queue, subscribeOptions );
        }.bind(this))
        .catch( function(err){ return Q.reject(err); } );
    } else {

        // Очередь инициализирована - ожидаются параметры только для подписи

        var subscribeOptions = typeof(options1)!='undefined' ? options1 : {} ;

        return this._enity[queueHash].then(function(queue){
            return this._consumeQueue( queue, subscribeOptions);
        }.bind(this))
        .catch( function(err){ return Q.reject(err); } );
    }

    return Q.reject( new Error('unexpected situation') );
}

/**
 * internal func - consume queue by passing channelObj, queueObj, consumeoptions
 * @param  {object} channel amqplib channel
 * @param  {object} queue   amqplib queue
 * @param  {object} options options for consume func
 * @return {promise}        promise, resolves as amqplib consume func result
 */
iRabbit.prototype._consumeQueue = function ( queue, options ){
    // console.log('options', options);
    var queueName = queue.queue,
        eventName = typeof(options.eventName)!='undefined' ? options.eventName : queueName ,
        locChannel = false;

    return this.channel('queue', queueName)
    .then(function( channel ){
        locChannel = channel;

        if( typeof(options.prefetch)!='undefined' ){
            // console.log('prefetching',options.prefetch);
            var p = parseInt(options.prefetch);
            if( p > 0 ) channel.prefetch( p );
            delete options.prefetch;
        }

        return channel.consume(
            queueName,
            function ConsumeCallback( message ){ // коллбэк ф-я приема сообщений

                // console.log( 'ConsumeCallback',message.properties.correlationId, message.content.toString() );

                var unpackedMessage = _unpackData( message );
                this.emit( 'receive',{
                    'type' : ( typeof(options.reseiveType)=='string'? options.reseiveType : 'queue' ),
                    'name' : eventName,
                    'queueName' : queueName,
                    'message' : unpackedMessage ,
                    'messageObj' : message,
                    'channel' : channel
                });
                this.emit( eventName+':message', {
                    'queueName' : queueName,
                    'message' : unpackedMessage ,
                    'messageObj' : message,
                    'channel' : channel
                });

                if(
                    ( typeof(options.noAck)=='undefined' || !options.noAck  ) &&
                    ( typeof(options.manualAck) == 'undefined' || !options.manualAck )
                ){
                    channel.ack( message );
                }

            }.bind(this),
            options
        );
    }.bind(this) )
    .catch( function(err){ return Q.reject(err); } )
    .then( function( consume ){
        return {
            'queue':queue,
            'consume':consume,
            'channel':locChannel
        };
    });
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
        var sendOptions = typeof(options2)!='undefined' ? options2 : {} ;

        return this.initQueue( name, initOptions ).then(function( queue ){
            return this._sendQueue(
                    queue,
                    message,
                    sendOptions
            );
        }.bind(this))
        .catch( function(err){ return Q.reject(err); } );

    } else {
        // Очередь инициализирована - ожидаются параметры только для подписи
        var sendOptions = typeof(options1)!='undefined' ? options1 : {} ;

        return this._enity[queueHash].then( function( queue ){
            return this._sendQueue(
                queue,
                message,
                sendOptions
            );
        }.bind(this) )
        .catch( function(err){ return Q.reject(err); } );
    }

    return Q.reject( new Error('unexpected situation') );
}

iRabbit.prototype._sendQueue = function( queue, message, options ){

    var packed = _packData(message),
        result = Q.defer();
    message = packed.data;
    options.contentType = packed.mime;
    options.contentEncoding = 'UTF8';

    var queueName = ( typeof(queue)=='string' ) ? queue : queue.queue;
    // console.log(this._channel);
    var res = this._channel.sendToQueue(queueName, message, options)
    if( res ){
        result.resolve( res );
    } else {
        result.reject( res );
    }

    return result.promise;
    /*return this.channel('queue', queueName).then(function( channel ){
        console.log('sending options2:',options);
        return channel.sendToQueue(queueName, message, options);
    }.bind(this) )
    .catch( function(err){ return Q.reject(err); } );*/
}

/*************************
 *          Exchange topic
 *************************/

iRabbit.prototype.initTopic = function( name, options ) {
    assert.equal(typeof (name), 'string',    "name string expected");

    //apply default options
    var defOptions = {
        'durable' : true,
        'internal' : false,
        'exclusive' : false,
        'autoDelete' : true
    };

    if( typeof(options) == 'undefined' ) options = defOptions;
    else options =  _.extend(defOptions, options);

    return this.channel( 'exchange', name ).then( function channelInited( channel ){
        var hashCode = 'exchange' + name;

        if( typeof(this._enity[hashCode])!='undefined' ) return this._enity[hashCode];

        this._enity[hashCode] = channel.assertExchange( name, 'topic' , options );

        return this._enity[hashCode];
    }.bind(this))
    .catch( function(err){ return Q.reject(err); } );
}

iRabbit.prototype.sendTopic = function( exchangeName, routingKey, message,  options1, options2 ) {
    assert.equal(typeof (exchangeName), 'string',    "exchangeName string expected");
    assert.equal(typeof (routingKey), 'string',    "routingKey string expected");
    assert.notEqual(typeof (message), 'undefined' , "message expected" );
    if(typeof(options1)=='undefined') options1={};
    if(typeof(options2)=='undefined') options2={};

    var locChannel = false,
        exchangeHash = 'exchange' + exchangeName;

    if( typeof( this._enity[ exchangeHash ] )=='undefined' || !this._enity[ exchangeHash ] ){
        //обменник еще не создан
        var initOptions = typeof(options1)!='undefined' ? options1 : {} ;
        var sendOptions = typeof(options2)!='undefined' ? options2 : {} ;

        return this.initTopic( exchangeName, initOptions ).then(function( exchange ){
            return this.channel( 'exchange', exchange.exchange ).then(function( channel ){
                locChannel = channel;
                return this._sendExchange(
                    channel,
                    exchange,
                    message,
                    routingKey,
                    sendOptions
                );
            }.bind(this) )
            .catch( function(err){ return Q.reject(err); } );
        }.bind(this))
        .catch( function(err){ return Q.reject(err); } );

    } else {
        //обменник уже создан
        var sendOptions = typeof(options1)!='undefined' ? options1 : {} ;

        return this.channel( 'exchange', exchangeName )
        .then(function( channel ){
            locChannel = channel;

            return this._enity[ exchangeHash ].then( function( exchange ){
                return this._sendExchange(
                    channel,
                    exchange,
                    message,
                    routingKey,
                    sendOptions
                );
            }.bind(this));
        }.bind(this) )
        .catch( function(err){ return Q.reject(err); } );
    }

    return Q.reject( new Error('unexpected situation') );
}

iRabbit.prototype._sendExchange = function( channel, exchange, message, routingKey, options ){

    var packed = _packData(message);

    options = typeof(options)=='object'? options : {};
    options.contentType = packed.mime;
    options.contentEncoding = 'UTF8';

    return channel.publish(
        exchange.exchange,
        routingKey,
        packed.data,
        options
    );
}

iRabbit.prototype.subscribeTopic = function( name, routingKey, options1, options2, options3 ){
    assert.equal(typeof (name), 'string',    "name string expected");
    assert.equal(typeof (routingKey), 'string',    "routingKey string expected");
    // {exclusive: true, durable:true}
    var locChannel = false,
        locExchange = false,
        exchangeHash = 'exchange' + name;

    if( typeof( this._enity[exchangeHash] )=='undefined' || !this._enity[exchangeHash] ){
        //exchange еще не создана
        var exchangeOptions = typeof(options1)!='undefined' ? options1 : {} ;
        var queueOptions = typeof(options2)!='undefined' ? options2 : {} ;
        var queueSubscribeOptions = typeof(options3)!='undefined' ? options3 : {} ;

        return this.initTopic( name, exchangeOptions ).then(function( exchange ){
            locExchange = exchange;
            return this._createBindSubscribeQueue( exchange, routingKey, queueOptions, queueSubscribeOptions );
        }.bind(this))
        .catch(function( err ){
            return Q.reject( err );
        });

    } else {
        //exchange есть
        var queueOptions = typeof(options1)!='undefined' ? options1 : {} ;
        var queueSubscribeOptions = typeof(options2)!='undefined' ? options2 : {} ;

        return this._enity[exchangeHash].then( function(exchange){
            return this._createBindSubscribeQueue( exchange , routingKey , queueOptions, queueSubscribeOptions );
        }.bind(this) )
    }

    return Q.reject( new Error('unexpected situation') );
}

iRabbit.prototype._createBindSubscribeQueue = function( exchange, routingKey, options, options2 ){

    var queueName = ''
      // , options2 = _.extend( typeof(options2)!='undefined'?options2:{} , {reseiveType:'topic'})
      , options2 = typeof(options2)!='undefined' ? options2 : {}
      , locQueue = false
      , locQueueConsume = false
      , locQueueSubscribe = false
      , locChannel = false
      ;
    options2.reseiveType = 'topic';

    if( typeof( options ) != 'undefined' && typeof( options.name ) != 'undefined' ){
        queueName = options.name;
        delete options.name;
    } else
        options2.eventName = exchange.exchange;

    return this.subscribeQueue( queueName, options, options2 )
    .then(function( result ){
        locQueue = result.queue;
        locQueueConsume = result.consume;

        // get channel
        return this.channel('exchange'+exchange.exchange)
        .then(function(channel){
            locChannel = channel;
            return channel.bindQueue( result.queue.queue, exchange.exchange, routingKey );
        }.bind(this)).catch(function(err){ return Q.reject(err) });
    }.bind(this))
    .catch(function(err){ return Q.reject(err) })
    .then( function( bindRes ){
        return {
            'queue':locQueue,
            'consume':locQueueConsume,
            'bind':bindRes,
            'channel':locChannel
        };
    });
}

/**
 * RPC queue
 */

iRabbit.prototype.rpcQueueServer = function( queueName, eventFunc, queueInitOptions, queueConsumeOptions, queueResponseOptions ){
    assert.equal(typeof (queueName), 'string',    "queueName string expected");
    assert.equal(typeof (eventFunc), 'function',    "eventFunc function expected");

    queueInitOptions = (typeof queueInitOptions != 'undefined') ? queueInitOptions : {};
    queueConsumeOptions = (typeof queueConsumeOptions != 'undefined') ? queueConsumeOptions : {};
    queueResponseOptions = (typeof queueResponseOptions != 'undefined') ? queueResponseOptions : {};

    queueConsumeOptions.noAck = false;
    queueConsumeOptions.prefetch = 1;

    /*this.on('receive',function(incObj){
        console.log('RECEIVED: ',incObj.type, incObj.message);
    });*/

    return this.subscribeQueue( queueName, queueInitOptions, queueConsumeOptions )
        .then(function( result ){

            this.on( result.queue.queue+':message', function(incMsg){
                return _processRPC.bind(this)( incMsg, eventFunc, queueResponseOptions )
                .catch(function(err){ return Q.reject(err) });

            }.bind(this));

            // ???
            return Q.resolve(result);

        }.bind(this))
        .catch(function(err){ return Q.reject(err) });
}

iRabbit.prototype.rpcQueueClient = function( serverQueueName, responceFunc, serverQueueOptions, callbackQueueOptions, callbackQueueConsumeOptions, sendOptions ){

    assert.equal(typeof (serverQueueName), 'string',    "serverQueueName string expected");
    // assert.equal(typeof (responceFunc), 'function',    "responceFunc function expected");
    if( typeof(responceFunc) == 'undefined' ) responceFunc = function( message ){};

    serverQueueOptions = (typeof serverQueueOptions != 'undefined') ? serverQueueOptions : {};
    callbackQueueOptions = (typeof callbackQueueOptions != 'undefined') ? callbackQueueOptions : {};
    callbackQueueConsumeOptions = (typeof callbackQueueConsumeOptions != 'undefined') ? callbackQueueConsumeOptions : {};
    sendOptions = (typeof sendOptions != 'undefined') ? sendOptions : {};

    callbackQueueOptions.exclusive = true;
    callbackQueueConsumeOptions.noAck = true;

    var hashCode = 'prcQueueClient' + serverQueueName;

    if( typeof(this._enity[hashCode])=='undefined' || !this._enity[hashCode] ){
        return this.initQueue( serverQueueName,serverQueueOptions )
        .then( function( serverQueue ){
            //counsume callback queue
            return this.subscribeQueue('',callbackQueueOptions, callbackQueueConsumeOptions )
            .then( function( subscribeRes ){
                // console.log('serverQueue', serverQueue);
                this._enity[hashCode] = new RpcQueueClient( this, serverQueue, subscribeRes.queue, sendOptions );
                this.on(subscribeRes.queue.queue+':message', function(message){
                    responceFunc(message);
                    _received.bind( this._enity[hashCode] )( message );
                });
                return this._enity[hashCode];
            }.bind(this) )
            .catch( function(err){ return Q.reject(err); } );

        }.bind(this) )
        .catch( function(err){ return Q.reject(err); } );
    } else {
        return Q.resolve( this._enity[hashCode] );
    }


    return Q.reject('PRC Queue Client create fail');
}


/**
 * RPC topic
 */
iRabbit.prototype.rpcTopicServer = function( exchangeName, routingKey, eventFunc, topicInitOptions, queueInitOptions, queueConsumeOptions, queueResponseOptions ){
    assert.equal(typeof (exchangeName), 'string',    "exchangeName string expected");
    assert.equal(typeof (routingKey), 'string',    "routingKey string expected");
    assert.equal(typeof (eventFunc), 'function',    "eventFunc function expected");

    topicInitOptions = (typeof topicInitOptions != 'undefined') ? topicInitOptions : {};
    queueInitOptions = (typeof queueInitOptions != 'undefined') ? queueInitOptions : {};
    queueConsumeOptions = (typeof queueConsumeOptions != 'undefined') ? queueConsumeOptions : {};
    queueResponseOptions = (typeof queueResponseOptions != 'undefined') ? queueResponseOptions : {};

    queueConsumeOptions.noAck = false;
    queueConsumeOptions.prefetch = 1;

    return this.subscribeTopic( exchangeName, routingKey, topicInitOptions, queueInitOptions, queueConsumeOptions )
    .then(function( result ){

        // add event listener for message

        this.on( exchangeName+':message', function(incMsg){
            return _processRPC.bind(this)( incMsg, eventFunc, queueResponseOptions )
            .catch(function(err){ return Q.reject(err) });
        }.bind(this));

        // ???
        return Q.resolve(result);

    }.bind(this))
    .catch(function(err){ return Q.reject(err) });
}

iRabbit.prototype.rpcTopicClient = function( exchangeName, responceFunc, topicInitOptions, callbackQueueOptions, callbackQueueConsumeOptions, sendOptions ){

    assert.equal(typeof (exchangeName), 'string',    "exchangeName string expected");
    // assert.equal(typeof (responceFunc), 'function',    "responceFunc function expected");
    if( typeof(responceFunc) == 'undefined' ) responceFunc = function( message ){};

    topicInitOptions = (typeof topicInitOptions != 'undefined') ? topicInitOptions : {};
    callbackQueueOptions = (typeof callbackQueueOptions != 'undefined') ? callbackQueueOptions : {};
    callbackQueueConsumeOptions = (typeof callbackQueueConsumeOptions != 'undefined') ? callbackQueueConsumeOptions : {};
    sendOptions = (typeof sendOptions != 'undefined') ? sendOptions : {};

    var hashCode = 'prcTopicClient' + exchangeName;

    if( typeof( this._enity[ hashCode ] ) == 'undefined' || !this._enity[ hashCode ] ){
        // subscribe callback queue
        return this.subscribeQueue('',callbackQueueOptions, callbackQueueConsumeOptions )
        // init exchange
        .then( function callbackQueueSubscribed( subscribeCallbackQueueResult ){
            // return channel.assertExchange(config.exchangeName, config.exchangeType, config.exchangeOptions);
            return this.initTopic(exchangeName, topicInitOptions)
            .then( function( subscribeExchange ){
                // console.log(
                //     subscribeCallbackQueueResult.queue.queue+':message'
                // );
                this._enity[ hashCode ] = new RpcTopicClient(
                    this,
                    subscribeExchange,
                    subscribeCallbackQueueResult.queue,
                    sendOptions
                );
                this.on(subscribeCallbackQueueResult.queue.queue+':message', function(message){
                    responceFunc(message);
                    _received.bind( this._enity[hashCode] )( message );
                });
                return this._enity[ hashCode ];
            }.bind(this) )
            .catch( function(err){ return Q.reject(err); } );
        }.bind(this))
        .catch( function(err){ return Q.reject(err); } );
    } else {
        // Вернуть промис зарезовленный как клиент
        return Q.resolve( this._enity[ hashCode ] );
    }

    return Q.reject('PRC Topic Client create fail');
}


/**
 * RpcQueueClient - subobject for RPC queue client case
 * @param {object} iRabbitInst   instance of iRabbit
 * @param {object} serverQueue   amqplib-queue of rpcQueueServer incuming queue
 * @param {object} callbackQueue amqplib-queue of prcQueueClient callback queue
 */
function RpcQueueClient( iRabbitInst, serverQueue, callbackQueue, sendOptions ){
    this._parent = iRabbitInst;
    this.serverQueue = serverQueue;
    this.callbackQueue = callbackQueue;

    this.buffer = [];
    this.sendProcess = false;

    this.sendOptions = typeof(sendOptions)!='undefined' ? sendOptions : {} ;
    this.sendOptions.replyTo = callbackQueue.queue;

    this.correlations = {};

    EventEmitter.call(this);
}

util.inherits(RpcQueueClient, EventEmitter);

// RpcQueueClient.prototype.__send = function( message, options ){}
RpcQueueClient.prototype.send = function( message, options ){
    var corrId = _generateUuid();

    this.correlations[ corrId ] = Q.defer();

    this._parent._sendQueue( this.serverQueue.queue, message, _.extend(
        this.sendOptions,
        options,
        { correlationId : corrId}
    ) )
    // .then(function( result ){}.bind(this))
    .catch( function(err){ return Q.reject( err );});

    // console.log( 'return promise' );
    return this.correlations[ corrId ].promise;
}


/**
 * RpcTopicClient - subobject for RPC topic client case
 * @param {object} iRabbitInst   instance of iRabbit
 * @param {object} serverQueue   amqplib-queue of rpcQueueServer incuming queue
 * @param {object} callbackQueue amqplib-queue of prcQueueClient callback queue
 */
function RpcTopicClient( iRabbitInst, serverExchange, callbackQueue, sendOptions ){
    this._parent = iRabbitInst;
    this.serverExchange = serverExchange;
    this.callbackQueue = callbackQueue;

    this.sendOptions = typeof(sendOptions)!='undefined' ? sendOptions : {} ;
    this.sendOptions.replyTo = callbackQueue.queue;

    this.correlations = {};

    EventEmitter.call(this);
}

util.inherits(RpcTopicClient, EventEmitter);

RpcTopicClient.prototype.send = function( routingKey, message, options ){
    var corrId = _generateUuid();

    this.correlations[ corrId ] = Q.defer();
    var options = _.extend(
        this.sendOptions,
        options,
        { correlationId : corrId }
    );

    // console.log( this.serverExchange, routingKey );
    return this._parent.sendTopic( this.serverExchange.exchange, routingKey , message, options )
    .then(function( result ){
        return this.correlations[ corrId ].promise;
    }.bind(this))
    .catch( function(err){ return Q.reject( err );});
}

/**
 * Вспомогательные ф-ии
 */
/**
 * Help function - processing RPC model for Queue and Topic RPCServers
 * @param  {[type]} incMsg [description]
 * @return {[type]}        [description]
 */
function _processRPC( incMsg, eventFunc, queueResponseOptions ){
    if(
        typeof(incMsg.messageObj.properties)=='undefined' ||
        typeof(incMsg.messageObj.properties.replyTo)=='undefined'
    ){
        // NEED LOG SOMEBODY ABOUT NOWHERE SEND RESPONSE
        return console.log('Expected replyTo property in message');
    }

    var rs = eventFunc( incMsg );
    if( typeof( rs.then ) == 'undefined' ){
        //Хм... похоже вернули не промис, ну что ж - сделать промис!
        rs = Q.resolve( rs );
    }

    // console.log( '[proc]', incMsg );

    return rs.then(
        function onResolve( responseMessage ){

            if(
                typeof(incMsg.messageObj.properties) != 'undefined' &&
                typeof(incMsg.messageObj.properties.correlationId) != 'undefined'
            ){
                queueResponseOptions.correlationId = incMsg.messageObj.properties.correlationId;
            }

            return this._sendQueue( incMsg.messageObj.properties.replyTo, responseMessage, queueResponseOptions )
            .catch( function(err){
                console.log('err', err);
                return Q.reject(err);
            });
        }.bind(this),
        function onReject( err ){
            console.log('err:',err);
            return this._sendQueue( incMsg.messageObj.properties.replyTo, err, queueResponseOptions )
            .catch( function(err){ return Q.reject(err); });
        }.bind(this)
    )
    .catch(function(err){
        console.log('errCatch:',err.stack);
        return this._sendQueue( incMsg.messageObj.properties.replyTo, responseMessage, queueResponseOptions )
        .catch( function(err){ return Q.reject(err); });
        // return Q.reject(err);
    });
}

function _packData( object ){
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

    res.data = new Buffer( res.data );
    return res;
}

function _unpackData( messageObj ){
    var result = false;

    result = messageObj.content.toString();

    switch( messageObj.properties.contentType ){
        case 'application/json':{
            try{
                result = JSON.parse( result );
            } catch ( e ){
                throw new Error('failed unpack data');
            }
            break;
        }
        case 'text/plain':
        default:{
            // result = messageObj.content.toString();
            // result = querystring.unescape( result );
        }
    }

    return result;
}

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
}

function _received( incMsg ){

    this.emit('receive',incMsg);

    if(
        typeof( incMsg.messageObj.properties )!='undefined' &&
        typeof( incMsg.messageObj.properties.correlationId )!='undefined' &&
        typeof( this.correlations[ incMsg.messageObj.properties.correlationId ] )!='undefined'
    ){
        this.correlations[ incMsg.messageObj.properties.correlationId ].resolve( incMsg );
        delete( this.correlations[ incMsg.messageObj.properties.correlationId ] );
    }
}

function _generateUuid(){
    // return ( parseInt(Math.random()*10000) ).toString();
    return uuid();
}


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