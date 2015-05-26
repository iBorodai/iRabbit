"use strict";

var config = require("./conf.api.js")
  , rabbit = require( "../src/iRabbit" )(config.rabbit)
  , assert = require( 'assert' );

//Check params
assert.equal(typeof (config.incomingQueueName), 'string',    "config.incomingQueueName string expected");
assert.equal(typeof (config.rabbit.exchangeName), 'string',    "config.rabbit.exchangeName string expected");
assert.equal(typeof (config.rabbit.topic.routingKey), 'string',    "config.rabbit.topic.routingKey string expected");


//Detect rabbit topic params
var callbackQueueName = ( typeof(config.rabbit.callbackQueueName)=='string' )?config.rabbit.callbackQueueName:'';


//PRC callback queue
rabbit.initAndSubscribeQueue(
    callbackQueueName,
    {
        // init:{},
        // subscribe:{}
    }
)
//init topic exchange
.then(function initedCallbackQueue( q ){

    return rabbit.initTopic({
          exchangeName : config.rabbit.exchangeName
        // , ack:true
        // , prefetchCount: 1
    });
})
.then(function initedTopicExchange( exchange ){

    //console.log( '[i] topic exchange: ',exchange.name,'inited' );

});


/**
 *  Rabbit events handlers
 */
rabbit.on('queue.subscribed',function(q){ console.log('(i) subscribed to ',q.name) });
rabbit.on('queue.error',function(err){console.log('(i) error ',err.stack)});

rabbit.on('queue.pull',function(message, headers, deliveryInfo, messageObj, q){
    console.log('[R]  queue:',q.name);
    console.log('     message:',message.data.toString('UTF-8'));
});

rabbit.on('topic.push',function(message, publishKey){
    console.log('[P] message published: '+res.message+', publishKey: '+res.publishKey, '(event)');
});
rabbit.on('topic.ready',function(){
    rabbit.topicPush(
            message,
            publishKey,
            {
                beforePublish:function( obj ){
                    obj.options.replyTo = callbackQueueName;
                }
            }
    )
    .then(function thenMessagePublished( res ){
        console.log('[P] message published: '+res.message+', publishKey: '+res.publishKey, '(promise)');
        /*rabbit.connection.disconnect();
        process.exit(1);*/
    });

});
