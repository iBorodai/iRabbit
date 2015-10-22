"use strict";

var conf    = require( './conf.js' ),
    iRabbit = require( '../iRabbit.js' )( conf ),
    when = require( 'when' );


module.exports = function( msg ){
    var deferred = when.defer();

    /*iRabbit.addListener('receive', function(incObj){
        console.log( 'receive event',incObj.message );
    });*/

    iRabbit.rpcQueueClient('rpcQueueServerIncQ')
    .then(function(client) {


        // console.log('sending ', msg);
        client.send( msg )
            .then(function(responce){
                // console.log('here3', responce.message);
                deferred.resolve(responce);
            });
    });
    return deferred.promise;
};