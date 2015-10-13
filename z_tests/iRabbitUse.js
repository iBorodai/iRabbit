"use strict";

var conf    = require( './conf.js' ),
    iRabbit = require( '../iRabbit.js' )( conf.rabbit );

// iRabbit.on('error',function(error){});

// iRabbit.connect();
// iRabbit.initQueue('testQueue');

// iRabbit.on('receive',function(message){
//     console.log( 'iRabbit receive event: ', message.type, message.queue, message.message );
// });
iRabbit.on('testQueue:message',function(message){
    console.log( 'testQueue:message event: ', message.message );
});
iRabbit.subscribeQueue('testQueue')
.then(function( queue ){
    // queue.on('receive',function(){
    //     console.log( 'event message received: ', message );
    // });
})
.catch( function(err){
    console.log('THE_ERROR', err.stack);
});
