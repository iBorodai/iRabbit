"use strict";

var config = require("./conf.api.js")
  , rabbit = require( "../iRabbit" )(config.rabbit)
  , assert = require( 'assert' );

//Get request params
var publishKey = (process.argv.length>2) ? process.argv[2] : false
  , message = (process.argv.length>3) ? process.argv.slice( 3 ).join(' ') : false;

//Check params
assert.equal(typeof (publishKey), 'string',    "publishKey string expected");
assert.equal(typeof (message), 'string',    "message string expected");
assert.equal(typeof (config.rabbit.topic.exchangeName), 'string',    "config.rabbit.topic.exchangeName string expected");

//Detect rabbit topic params
var callbackQueueName = ( typeof(config.rabbit.callbackQueueName)=='string' )?config.rabbit.callbackQueueName:'';

//Define and subscribe callback Queue
rabbit.initAndSubscribeQueue(
    callbackQueueName,
    {
        // init:{},
        // subscribe:{}
    }
)
.then(function initedCallbackQueue( q ){

    //rabbit.callbackQ = q;

    return rabbit.initTopic({
          exchangeName : config.rabbit.topic.exchangeName
        // , ack:true
        // , prefetchCount: 1
    });
})
.then(function initedTopicExchange( exchange ){

    //console.log( '[i] topic exchange: ',exchange.name,'inited' );

});



//Rabbit events handlers
rabbit.on('queue.subscribed',function(q){ console.log('(i) subscribed to ',q.name) });
rabbit.on('queue.error',function(err){console.log('(i) error ',err.stack)});

rabbit.on('queue.pull',function(message, headers, deliveryInfo, messageObj){
    console.log('[R] message received',message.data.toString('UTF-8'));
    rabbit.connection.disconnect();
    process.exit(1);
});

rabbit.on('topic.push',function(message, publishKey){
    console.log('[P] message published: '+message+', publishKey: '+publishKey, '(event)');
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
