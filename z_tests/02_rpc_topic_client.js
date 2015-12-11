"use strict";

var conf    = require( './conf.js' ),
    iRabbit = require( '../iRabbit.js' )( conf.rabbit ),
    util = require('util'),
    uuid = require('node-uuid');

                iRabbit.rpcTopicClient(
                    'rpcTopicExchange'
                ).then(function( client ){

                    client.send( 'check.user.token', 'Message1' )
                    .then(function(responce){
                        console.log('responce from Promice',responce.message);
                    })
                    .catch(function(err){ console.log('ERR_SEND',err.stack); });

                    client.send( 'check.user.token', 'Message2' )
                    .then(function(responce){
                        console.log('responce from Promice',responce.message);
                    })
                    .catch(function(err){ console.log('ERR_SEND',err); });

                    client.send( 'check.user.token', 'Message3' )
                    .then(function(responce){
                        console.log('responce from Promice',responce.message);
                    })
                    .catch(function(err){ console.log('ERR_SEND',err.stack); });

                })
                .catch(function(err){ console.log('ERR',err.stack); });


function done() {
    console.log('Terrible process exit! Bye!');
    process.exit();
}