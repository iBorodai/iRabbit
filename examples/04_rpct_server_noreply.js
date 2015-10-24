"use strict";

var conf    = require( './conf.js' ),
    when = require( 'when' ),
    iRabbit = require( '../iRabbit.js' )( conf );

iRabbit.rpcTopicServer(
    'rpcTopicExchange',
    'x.y.*',
    function(incMsg){
        console.log('received message', incMsg.message, 'return nothing' );
    }
).catch( function(err){
    console.log('THE_ERROR', err);
});