"use strict";

var conf    = require( './conf.js' ),
    iRabbit = require( '../iRabbit.js' )( conf ),
    when = require( 'when' );

/*iRabbit.on('receive',function( incMsg ){
    console.log( 'receive event: ', incMsg.eventName,  incMsg.message );
});*/

when.all([
    iRabbit.subscribeQueue('testQueue')
    .then( function( result ){
        var queueName = result.queue.queue;
        iRabbit.on( queueName+':message',function(incMsg){
            console.log( queueName+':message event: ', incMsg.message );
        });
        return result;
    }),
    iRabbit.subscribeQueue('testQueue2')
    .then( function( result ){
        var queueName = result.queue.queue;
        iRabbit.on( queueName+':message',function(incMsg){
            console.log( queueName+':message event: ', incMsg.message );
        });
        return result;
    })
])
.then(function(res){
    console.log('Wating for messages. Exit CTRL+C');
})
.catch( function( err ){
    console.log('THE_ERROR', err);
});