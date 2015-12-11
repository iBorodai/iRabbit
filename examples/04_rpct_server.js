"use strict";

var conf    = require( './conf.js' ),
    when = require( 'when' ),
    iRabbit = require( '../iRabbit.js' )( conf );

// app params
var args = process.argv.slice(2);
var routingKey = (args.length > 0) ? args[0] : 'z.z.*';

// console.log( args, routingKey ); process.exit();

iRabbit.rpcTopicServer(
    'commonExchange',
    routingKey,
    function( incMsg ){
        console.log( '->received message:', incMsg.message,'(', incMsg.messageObj.properties.correlationId ,')' );
        if( incMsg.message.search('slow')!=-1 )
            return slowResponse( incMsg );
        else
            return fastResponse( incMsg );

    }
).catch( function(err){
    console.log('THE_ERROR', err);
})


function fastResponse( incMsg ){
        console.log('<-sending response:',incMsg.message,'(', incMsg.messageObj.properties.correlationId ,')')
        return 'responseMessage for ' + incMsg.message;
}

function slowResponse( incMsg ){

        var procTime = parseInt(Math.random()*5000);
        console.log('process time: ',procTime, 'msg:', incMsg.message);
        var deferred =  when.defer();

        setTimeout( function(){
            console.log('<-sending response:',incMsg.message,'(', incMsg.messageObj.properties.correlationId ,')')
            deferred.resolve( 'responseMessage for ' + incMsg.message );
        }, procTime );

        return deferred.promise;
}