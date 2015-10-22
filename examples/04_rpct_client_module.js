"use strict";

var conf    = require( './conf.js' ),
    iRabbit = require( '../iRabbit.js' )( conf ),
    when = require( 'when' );

module.exports = function( routingKey, msg ){
    var deferred = when.defer();

    // iRabbit.addListener('receive',function( incObj ){
    //     console.log('event receive', incObj.message);
    // });

    iRabbit.rpcTopicClient( 'rpcTopicExchange' ).then(function( client ){
        client.send( routingKey, msg ).then(function(responce){

            deferred.resolve(responce);

        })
        .catch(function(err){ return when.reject(err) })
    })
    .catch(function(err){ console.log('ERR',err); });

    return deferred.promise;
};