"use strict";

var conf    = require( './conf.js' ),
    Q    = require( 'q' ),
    iRabbit = require( '../iRabbit.js' )( conf.rabbit );


// PRC topic server
iRabbit.rpcTopicServer(
    'rpcTopicExchange',
    '#',
    function( incMsg ){
        console.log('received',incMsg.message);
        return 'responseMessage for ' + incMsg.message;

        var deferred =  Q.defer();

        var procTime = parseInt(Math.random()*10000);

        console.log('pt: ',procTime,' :',incMsg.messageObj.properties.correlationId);

        setTimeout( function(){
            console.log('send Resp', incMsg.messageObj.properties.correlationId);
            deferred.resolve( 'responseMessage for ' + incMsg.message );
        }, procTime );

        return deferred.promise;
    }
).catch( function(err){
    console.log('THE_ERROR', err);
}).done( function(result){
    // console.log('DONE', result);
} );
