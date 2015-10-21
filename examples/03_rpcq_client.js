"use strict";

var conf    = require( './conf.js' ),
    iRabbit = require( '../iRabbit.js' )( conf ),
    when = require( 'when' );

iRabbit.rpcQueueClient(
    'rpcQueueServerIncQ'
).then(function( client ){

    when.all([

        client.send( 'Message1' )
        .then(function(responce){
            console.log('responce from Promice',responce.message);
            return responce;
        }),

        client.send( 'Loong' )
        .then(function(responce){
            console.log('responce from Promice',responce.message);
            return responce;
        }),

        client.send( 'Message3' )
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
