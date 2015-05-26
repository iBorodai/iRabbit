"use strict";

var config = require("./conf.users.js")
  , rabbit = require( "../iRabbit" )(config.rabbit)
  , assert = require( 'assert' );

//Check params
assert.equal(typeof (config.rabbit.topic.exchangeName), 'string',    "config.rabbit.topic.exchangeName string expected");
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

    return rabbit.initTopic();
})
//Subscribe topic with service Queue and RoutingKey
.then(function initedTopicExchange( exchange ){

    return rabbit.topicSubscribe({
        // exchangeName:'...',
        // routingKey:'...'
    });

})
//Subscribed on topic by service Queue and RoutingKey
.then(function( res ){
    console.log('(i) subscribed for topic queue '+res.queue.name+' with routingKey:'+res.routingKey);
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


rabbit.on('topic.ready',function onTopicExchange( exchange ){
    console.log('(i) topic exchange '+exchange.name+' ready');
/*
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
        //rabbit.connection.disconnect();
        //process.exit(1);
    });
*/
});
rabbit.on('topic.push',function(message, publishKey){
    console.log('[P] message published: '+res.message+', publishKey: '+res.publishKey, '(event)');
});
rabbit.on('topic.pull',function(message, headers, deliveryInfo, messageObj){
    var message = message.data.toString('utf-8');
    console.log( " [x] %s", message );

    message+=' + pushBackData';

    this.pushQueue(
        deliveryInfo.replyTo,
        message
    );
});
