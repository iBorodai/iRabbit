"use strict";

var conf    = require( './conf.js' ),
    when = require( 'when' ),
    iRabbit = require( '../iRabbit.js' )( conf );

iRabbit.rpcQueueServer(
    'rpcQueueServerIncQ',
    function(incMsg){
        console.log('received message', incMsg.message );
        return ( incMsg.message == 'Loong' ) ? slowResponse( incMsg ) : fastResponse( incMsg ) ;
    }
).catch( function(err){
    console.log('THE_ERROR', err.stack);
});


function fastResponse( incMsg ){

        return 'responseMessage for ' + incMsg.message;
}

function slowResponse( incMsg ){

        var procTime = parseInt(Math.random()*10000);
        console.log('process time: ',procTime, 'msg:', incMsg.message);
        var deferred =  when.defer();

        var procTime = parseInt(Math.random()*10000);
        console.log('process time: ',procTime);

        setTimeout( function(){
            console.log('send Resp');
            deferred.resolve( 'responseMessage for ' + incMsg.message );
        }, procTime );

        return deferred.promise;
}