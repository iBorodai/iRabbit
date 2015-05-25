"use strict";

var config = require("../conf.js")
  , rabbit = require( "../src/iRabbit" )(config.rabbit);


var publishKey = (process.argv.length>2) ? process.argv[2] : 'TEST.send.user'
  , message = (process.argv.length>3) ? process.argv.slice( 3 ).join(' ') : 'Test default data';

//console.log(publishKey, message);
var testTopicCallbackQName = 'testTopicCallbackQ';

rabbit.on('queue.subscribed',function(q){ console.log('(i) subscribed to ',q.name) });
rabbit.on('queue.error',function(err){console.log('(i) error ',err.stack)});
rabbit.on('queue.pull',function(message, headers, deliveryInfo, messageObj){
    console.log('[M] ',message.data.toString('UTF-8'));
    rabbit.connection.disconnect();
    process.exit(1);
});

rabbit.on('topic.push',function(message, publishKey){
    console.log('[>] message sent: ',message, publishKey,'(event)');
});

rabbit.initAndSubscribeQueue(
    testTopicCallbackQName,
    {
        init:{},
        subscribe:{}
    }
)
.then(function initedCallbackQueue( q ){

    rabbit.callbackQ = q;

    return rabbit.initTopic({
          exchangeName : 'tetsTopicExchange'
        // , ack:true
        // , prefetchCount: 1
    });
})
.then(function initedTopicExchange( exchange ){

    console.log( '[i] topic exchange: ',exchange.name,'inited' );

    rabbit.topicPush(
            message,
            publishKey,
            {
                beforePublish:function( obj ){
                    obj.options.replyTo = testTopicCallbackQName;
                }
            }
    )
    .then(function receivedCallback( res ){
        console.log('[>] message: '+res.message+', publishKey: '+res.publishKey, '(promise)');
        /*rabbit.connection.disconnect();
        process.exit(1);*/
    });

});