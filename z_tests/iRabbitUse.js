"use strict";

var conf    = require( './conf.js' ),
    iRabbit = require( '../iRabbit.js' )( conf.rabbit );

// iRabbit.on('error',function(error){});

// iRabbit.connect();
// iRabbit.initQueue('testQueue');


/*iRabbit.on('testQueue:message',function(message){
    console.log( 'testQueue:message event: ', message.message );
});
iRabbit.subscribeQueue('testQueue').catch( function( err ){
    console.log('THE_ERROR', err.stack);
});*/

iRabbit.on('receive',function(message){
    console.log( 'iRabbit receive event: ', message );
});
iRabbit.on('testExchange:message',function(message){
    console.log( 'testExchange:message event: ', message );
});
iRabbit.subscribeTopic('testExchange', 'test.*.*').catch( function( err ){
    console.log('THE_ERROR', err.stack);
});
