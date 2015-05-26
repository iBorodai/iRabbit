"use strict";

var config = require("./conf.js")
  , rabbit = require( "../iRabbit" )(config.rabbit);


var routingKey = (process.argv.length>2) ? process.argv[2] : "#";

rabbit.topicSubscribe({
    exchangeName : 'tetsTopicExchange'
  , routingKey : routingKey
})
.then(function( res ){
    console.log('(i) subscribed for topic queue '+res.queue.name+' with routingKey:'+res.routingKey);
});



rabbit.on('topic.pull',function(message,headers, deliveryInfo, messageObj){
    var message = message.data.toString('utf-8');
    console.log( " [x] %s", message );

    message+=' + pushBackData';

    this.pushQueue(
        deliveryInfo.replyTo,
        message
    );
});
