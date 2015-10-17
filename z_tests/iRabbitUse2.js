"use strict";

var conf    = require( './conf.js' ),
    iRabbit = require( '../iRabbit.js' )( conf.rabbit ),
    util = require('util');

    /*iRabbit.on('receive',function(incMsg){
        console.log('Common event "receive":',incMsg.message);
    });*/

        // для ввода текста из консоли
        process.stdin.resume();
        process.stdin.setEncoding('utf8');

        console.log('type message:');
        process.stdin.on('data', function (text) {
            // text = util.inspect(text).split('\\')[0].substring(1);
            if (text === 'quit') {
                done();
            } else {

                //send to queue testQueue
                // iRabbit.sendQueue('testQueue', text).then( console.log ).catch( console.log );
                // iRabbit.sendQueue('rpcQueueServerIncQ', text).then( console.log ).catch( console.log );

                //send to exchange
                /*var exchange = 'testExchange',
                    message = { messageText:text, time:new Date() },
                    routingKey = 'test.message.aaa';

                console.log('sending message', message, ' to ', exchange, ' with ', routingKey);

                iRabbit.sendTopic( exchange, routingKey, message )
                .then(function( result ){
                    console.log( 'result', result );
                })
                .catch( function(err){
                    console.log('THE_ERROR', err.stack);
                });*/


                // PRC client queue
                iRabbit.rpcQueueClient(
                    'rpcQueueServerIncQ'
                ).then(function( client ){

                    client.send( text )
                    .then(function(responce){
                        console.log('responce from Promice',responce.message);
                    })
                    .catch(function(err){ console.log('ERR_SEND',err); })
                    ;

                })
                .catch(function(err){ console.log('ERR',err.stack); }) ;

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
            }
        });


function done() {
    console.log('Terrible process exit! Bye!');
    process.exit();
}