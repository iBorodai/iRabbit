"use strict";

var conf    = require( './conf.js' ),
    Q    = require( 'q' ),
    iRabbit = require( '../iRabbit.js' )( conf.rabbit );

// iRabbit.on('error',function(error){});

// iRabbit.connect();
// iRabbit.initQueue('testQueue');

// subscribe queue testQueue

// iRabbit.on('receive',console.log);
/*iRabbit.on('testQueue:message',function(message){
    console.log( 'testQueue:message event: ', message.message );
});
iRabbit.subscribeQueue('testQueue').catch( function( err ){
    console.log('THE_ERROR', err.stack);
});*/


// subscribe topic

// iRabbit.on('receive',console.log);
/*iRabbit.on('testExchange:message',function(incMsg){
    console.log( 'testExchange:message event: ', incMsg.message );
});
iRabbit.subscribeTopic('testExchange', 'test.*.*')
.catch( function( err ){
    console.log('THE_ERROR', err.stack);
});*/

// RPC queue server function( queueName, eventFunc, queueInitOptions, queueConsumeOptions, queueResponseOptions )
/*iRabbit.rpcQueueServer(
    'rpcQueueServerIncQ',
    function( incMsg ){
        return 'responseMessage for ' + incMsg.message;

        // var deferred =  Q.defer();

        // var procTime = parseInt(Math.random()*10000);
        // console.log('process time: ',procTime);

        // setTimeout( function(){
        //     console.log('send Resp');
        //     deferred.resolve( 'responseMessage for ' + incMsg.message );
        // }, procTime );

        // return deferred.promise;
    }
    // , null, { manualAck:true }
).catch( function(err){
    console.log('THE_ERROR', err);
}).done( function(result){
    // console.log('DONE', result);
} );*/

// PRC topic server
iRabbit.rpcTopicServer(
    'rpcTopicExchange',
    '#',
    function( incMsg ){
        return 'responseMessage for ' + incMsg.message;
        /*var deferred =  Q.defer();

        var procTime = parseInt(Math.random()*10000);
        console.log('process time: ',procTime);

        setTimeout( function(){
            console.log('send Resp', incMsg.messageObj.properties.correlationId);
            deferred.resolve( 'responseMessage for ' + incMsg.message );
        }, procTime );

        return deferred.promise;*/
    }
).catch( function(err){
    console.log('THE_ERROR', err);
}).done( function(result){
    // console.log('DONE', result);
} );