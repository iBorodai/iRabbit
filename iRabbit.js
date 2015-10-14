"use strict";

var EventEmitter = require( "events" ).EventEmitter
  , amqp = require('amqplib')
  , util = require('util')
  , assert = require( 'assert' )
  , _ = require( 'underscore' )
  // , when = require('./node_modules/amqplib/node_modules/when') // --- just test require sub module - BUT!!! may be should use "when.js" instead of "Q"
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

    if( arguments.length == 1 && typeof(forEntityType) == 'boolean' ){
        confirmChannel = forEntityType;
    }
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
 * @param  {[type]} name    [description]
 * @param  {[type]} options [description]
 * @return {[type]}         promice
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

            /*this._enity[hashCode].then(function(queue){
                this._queues[ name ] = new iRabbitQueue( this, channel, queue );
                console.log('HERE!', this._queues[ name ] );
            });*/

            return this._enity[hashCode];
        }.bind(this)
    ) . catch( function(err){ return Q.reject(err); } );
}

iRabbit.prototype.subscribeQueue = function( name, options1, options2 ){
    assert.equal(typeof (name), 'string',    "name string expected");

    var locChannel = false,
        queueHash = 'queue'+name;

    if( typeof( this._enity[queueHash] )=='undefined' || !this._enity[queueHash] ){
        // Если очередь еще не инициализирована - ожидаются отдельные параметры для инита и подписи

        var initOptions = typeof(options1)!='undefined' ? options1 : {} ;
        var subscribeOptions = typeof(options2)!='undefined' ? options2 : {} ;

        return this.initQueue( name, initOptions )
        .then(function( queue ){
                return this.channel('queue', queue.queue)
                        .then(function( channel ){
                            return this._consumeQueue(
                                channel,
                                queue,
                                subscribeOptions
                            );
                        }.bind(this) )
                        .catch( function(err){ return Q.reject(err); } )
                        .then( function( consume ){
                            return {
                                'queue':queue,
                                'consume':consume
                            };
                        });
        }.bind(this))
        .catch( function(err){ return Q.reject(err); } );
    } else {
        // Очередь инициализирована - ожидаются параметры только для подписи

        var subscribeOptions = typeof(options1)!='undefined' ? options1 : {} ;
        return this.channel('queue', queue.queue)
                .then(function( channel ){
                    return this._consumeQueue(
                        channel,
                        this._enity[queueHash],
                        subscribeOptions
                    );
                }.bind(this))
                .catch( function(err){ return Q.reject(err); } );
    }

    return Q.reject( new Error('unexpected situation') );
}

iRabbit.prototype._consumeQueue = function ( channel, queue, options ){

    var queueName = queue.queue,
        eventName = typeof(options.eventName)!='undefined' ? options.eventName : queueName ;

    return channel.consume(
        queueName,
        function ConsumeCallback( message ){ // коллбэк ф-я приема сообщений

            // throw new Error('test error');
            var unpackedMessage = this._unpackData( message );
            this.emit( 'receive',{
                'type' : ( typeof(options.reseiveType)=='string'? options.reseiveType : 'queue' ),
                'name' : eventName,
                'queueName' : queueName,
                'message' : unpackedMessage ,
                'messageObj' : message
            });
            this.emit( eventName+':message', {
                'queueName' : queueName,
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
        var sendOptions = typeof(options2)!='undefined' ? options2 : {} ;

        return this.initQueue( name, initOptions ).then(function( queue ){
            return this.channel('queue', queue.queue).then(function( channel ){
                locChannel = channel;
                return this._sendQueue(
                    channel,
                    queue,
                    message,
                    sendOptions
                );
            }.bind(this) )
            .catch( function(err){ return Q.reject(err); } );
        }.bind(this))
        .catch( function(err){ return Q.reject(err); } );

    } else {
    // Очередь инициализирована - ожидаются параметры только для подписи

        var sendOptions = typeof(options1)!='undefined' ? options1 : {} ;
        return this.channel('queue', this._enity[queueHash].queue).then(function( channel ){
            locChannel = channel;

            return this._sendQueue(
                channel,
                this._enity[queueHash],
                message,
                sendOptions
            );
        }.bind(this))
        .catch( function(err){ return Q.reject(err); } );

    }

    return Q.reject( new Error('unexpected situation') );
}

iRabbit.prototype._sendQueue = function( channel, queue, message, options ){

    var packed = this._packData(message);
    message = packed.data;
    options.contentType = packed.mime;
    options.contentEncoding = 'UTF8';

    var queueName = queue.queue;
    return channel.sendToQueue(queueName, message, options);
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

        return this.channel( 'exchange', this._enity[ exchangeHash ].exchange ).then(function( channel ){
            locChannel = channel;
            return this._sendExchange(
                channel,
                this._enity[ exchangeHash ],
                message,
                routingKey,
                sendOptions
            );
        }.bind(this) )
        .catch( function(err){ return Q.reject(err); } );
    }

    return Q.reject( new Error('unexpected situation') );
}

iRabbit.prototype._sendExchange = function( channel, exchange, message, routingKey, options ){

    var packed = this._packData(message);

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

iRabbit.prototype.subscribeTopic = function( name, routingKey, options1, options2 ){
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

        return this.initTopic( name, exchangeOptions ).then(function( exchange ){
            locExchange = exchange;
            return this._createBindSubscribeQueue( exchange, queueOptions, routingKey );
        }.bind(this))
        .catch(function( err ){
            return Q.reject( err );
        });

    } else {
        //exchange есть
        var queueOptions = typeof(options1)!='undefined' ? options1 : {} ;
        return this._createBindSubscribeQueue(this._enity[exchangeHash], queueOptions, routingKey );
    }

    return Q.reject( new Error('unexpected situation') );
}

iRabbit.prototype._createBindSubscribeQueue = function( exchange, options, routingKey ){

    var queueName = '';
    if( typeof( options ) != 'undefined' && typeof( options.name ) != 'undefined' ){
        queueName = options.name;
        delete options.name;
    } else
        options.eventName = exchange.exchange;
    // console.log( options );
    return this.subscribeQueue( queueName, options, {reseiveType:'topic'} )
    .then(function( result ){
        // get channel
        return this.channel('exchange'+exchange.exchange).then(function(channel){
            console.log(result.queue.queue, exchange.exchange, routingKey );
            return channel.bindQueue( result.queue.queue, exchange.exchange, routingKey );
        }.bind(this)).catch(function(err){ return Q.reject(err) });
    }.bind(this))
    .catch(function(err){ return Q.reject(err) });
}

/**
 * Common methods-helpers
 */
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

    res.data = new Buffer( res.data );
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