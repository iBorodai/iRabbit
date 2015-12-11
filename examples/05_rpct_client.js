"use strict";

var conf    = require( './conf.js' ),
    iRabbit = require( '../iRabbit.js' )( conf ),
    when = require( 'when' );

// app params
var args = process.argv.slice(2);
var routingKey = (args.length > 0) ? args[0] : 'z.z.z';
var message = (args.length > 1) ? args[1] : 'defaultMessage';

iRabbit.on('expired',function(msg){
    console.log('event expired listener', msg );
});

iRabbit.rpcTopicClient( 'commonExchange' ).then(function( client ){
    console.log('sending RK:',routingKey);
    return client.send( routingKey, message, {expiration:6000} )
    .then(function(responce){
        console.log('responce from Promice',responce.message);
    })
    .catch(function(err){ return when.reject(err) })
    .finally(function(){
        iRabbit.close();
    });

})
.catch(function(err){ console.log('ERR',err); });
