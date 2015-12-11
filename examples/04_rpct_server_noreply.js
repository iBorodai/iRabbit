"use strict";

var conf    = require( './conf.js' ),
    when = require( 'when' ),
    iRabbit = require( '../iRabbit.js' )( conf );

iRabbit.rpcTopicServer(
    'rpcTopicExchange',
    'x.y.*',
    function(incMsg){
        console.log('received message', incMsg.message, 'response in real looong time' );
        return slooooowResponse( incMsg );
    },{
        consume:{
            manualAck:true,
            // noAck:false,
            prefetch:1
        },
        initQueue:{
            deadLetterRoutingKey:'x.y',
            messageTtl:500
        }
    }
).catch( function(err){
    console.log('THE_ERROR', err);
});

function slooooowResponse( incMsg ){

        var procTime = 20000; // 20 sec
        console.log('process time: ',procTime, 'msg:', incMsg.message);
        var deferred =  when.defer();

        setTimeout( function(){
            console.log('<-sending response:',incMsg.message,'(', incMsg.messageObj.properties.correlationId ,')')
            deferred.resolve( 'responseMessage for ' + incMsg.message );
        }, procTime );

        return deferred.promise;
}