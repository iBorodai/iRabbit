"use strict";

var conf    = require( './conf.js' ),
    iRabbit = require( '../iRabbit.js' )( conf ),
    when = require( 'when' );

iRabbit.rpcTopicClient(
    'rpcTopicExchange'
).then(function( client ){

    when.all([

        client.send( 'x.y.z', 'Message1' )
        .then(function(responce){
            console.log('responce from Promice',responce.message);
            return responce;
        }),

        client.send( 'x.y.a', 'Loong' )
        .then(function(responce){
            console.log('responce from Promice',responce.message);
            return responce;
        }),

        client.send( 'x.y.x', 'Еще сообщение' )
        .then(function(responce){
            console.log('responce from Promice',responce.message);
        })

    ])
    .catch(function(err){ return when.reject(err) })
    .finally(function(){
        iRabbit.close();
    });

})
.catch(function(err){ console.log('ERR',err); });
