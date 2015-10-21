"use strict";

var conf    = require( './conf.js' ),
    iRabbit = require( '../iRabbit.js' )( conf );

iRabbit.on('receive',function( incMsg ){
    console.log( 'receive event: ', incMsg.message );
});

iRabbit.subscribeQueue('testQueue')
.then( function( result ){
    var queueName = result.queue.queue;
    iRabbit.on( queueName+':message',function(incMsg){
        console.log( queueName+':message event: ', incMsg.message );
    });

    console.log('Wating for messages. Exit CTRL+C');
    return result;
}).catch( function( err ){
    console.log('THE_ERROR', err);
});
