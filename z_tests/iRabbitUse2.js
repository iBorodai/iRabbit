"use strict";

var conf    = require( './conf.js' ),
    iRabbit = require( '../iRabbit.js' )( conf.rabbit ),
    util = require('util');


        // для ввода текста из консоли
        process.stdin.resume();
        process.stdin.setEncoding('utf8');

        console.log('type message:');
        process.stdin.on('data', function (text) {
            text = util.inspect(text).split('\\')[0].substring(1);
            if (text === 'quit') {
                done();
            } else {

                var exchange = 'testExchange',
                    message = text,
                    routingKey = 'test.message.aaa';

                console.log('sending message', message, ' to ', exchange, ' with ', routingKey);

                iRabbit.sendTopic( exchange, routingKey, message )
                .then(function( result ){
                    console.log( 'result', result );
                })
                .catch( function(err){
                    console.log('THE_ERROR', err.stack);
                });

            }
        });


function done() {
    console.log('Terrible process exit! Bye!');
    process.exit();
}