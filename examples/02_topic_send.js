"use strict";

var conf    = require( './conf.js' ),
    iRabbit = require( '../iRabbit.js' )( conf ),
    when = require( 'when' );

var exchange = 'testExchange',
    message = { messageText:'test message 123456', time:new Date() },
    routingKey = 'test1.test2.test3';

iRabbit.sendTopic( exchange, routingKey, message )
.then(function( result ){
    console.log('sent message', message, ' to ', exchange, ' with ', routingKey);
})
.catch( function(err){
    console.log('THE_ERROR', err);
})
.finally( function(){
    iRabbit.close();
} );