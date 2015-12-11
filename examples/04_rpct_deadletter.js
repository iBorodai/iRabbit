"use strict";

var conf    = require( './conf.js' ),
    iRabbit = require( '../iRabbit.js' )( conf );

iRabbit.on('receive',function( incMsg ){
    console.log( 'receive event: ', incMsg.message );
});


iRabbit.subscribeTopic('defaultDeadLetterExchange', '#').then(function( result ){
    iRabbit.on(result.eventName+':message',function( incMsg ){
        console.log( result.eventName+':message event: ', incMsg.message );
    });
})
.catch( function( err ){
    console.log('THE_ERROR', err.stack);
});
