"use strict";

var conf    = require( './conf.js' ),
    iRabbit = require( '../iRabbit.js' )( conf.rabbit ),
    util = require('util'),
    uuid = require('node-uuid');

    /*iRabbit.on('receive',function(incMsg){
        console.log('Common event "receive":',incMsg.message);
    });*/

        // для ввода текста из консоли
        // process.stdin.resume();
        // process.stdin.setEncoding('utf8');

        // console.log('type message:');
        // process.stdin.on('data', function (text) {
        //     // text = util.inspect(text).split('\\')[0].substring(1);
        //     if (text === 'quit') {
        //         done();
        //     } else {

                //send to queue testQueue
                // iRabbit.sendQueue('testQueue', 'test message').then( console.log ).catch( console.log );

                //send to exchange
                /*var exchange = 'testExchange',
                    message = { messageText:'test message 123456', time:new Date() },
                    routingKey = 'test.test.test';

                console.log('sending message', message, ' to ', exchange, ' with ', routingKey);

                iRabbit.sendTopic( exchange, routingKey, message )
                .then(function( result ){
                    console.log( 'result', result );
                })
                .catch( function(err){
                    console.log('THE_ERROR', err.stack);
                });*/


                // PRC client queue
                /*iRabbit.rpcQueueClient(
                    'rpcQueueServerIncQ'
                ).then(function( client ){

                    client.send( text )
                    .then(function(responce){
                        console.log('responce from Promice',responce.message);
                    })
                    .catch(function(err){ console.log('ERR_SEND',err); })
                    ;

                })
                .catch(function(err){ console.log('ERR',err.stack); }) ;*/

                // PRC client topic
                /*iRabbit.rpcTopicClient(
                    'rpcTopicExchange'
                    // , function( resp ){ console.log('responce', resp); }
                ).then(function( client ){
                    client.send( 'some.routing.key', text )
                    .then(function(responce){
                        console.log('responce from Promice',responce.message);
                    })
                    .catch(function(err){ console.log('ERR_SEND',err); });
                })
                .catch(function(err){ console.log('ERR',err.stack); });*/
        //     }
        // });


                /*iRabbit.rpcQueueClient(
                    'rpcQueueServerIncQ'
                ).then(function( client ){

                    client.send( 'Message1' )
                    .then(function(responce){
                        console.log('responce from Promice',responce.message);
                    })
                    .catch(function(err){ console.log('ERR_SEND',err); });

                    client.send( 'Message2' )
                    .then(function(responce){
                        console.log('responce from Promice',responce.message);
                    })
                    .catch(function(err){ console.log('ERR_SEND',err); });

                    client.send( 'Message3' )
                    .then(function(responce){
                        console.log('responce from Promice',responce.message);
                    })
                    .catch(function(err){ console.log('ERR_SEND',err); });

                })
                .catch(function(err){ console.log('ERR',err.stack); });*/

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

                /*var message = 'text1', corrId = uuid();
                for( var i=1; i<4; i++ ){
                    message = 'text'+i;
                    corrId = uuid();
                    // console.log('sending ', corrId, message);
                    iRabbit.sendQueue('testQueue', message, null, {correlationId:corrId}).then( console.log ).catch( console.log );
                }*/

function done() {
    console.log('Terrible process exit! Bye!');
    process.exit();
}