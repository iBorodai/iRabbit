"use strict";

var amqp = require('amqplib');

var connection = false,
    channel = false,
    queue = false;
var cp = amqp.connect( 'amqp://guest:guest@localhost:5672' );
// var cp = amqp.connect( 'amqp://guest:guest@localhost:5671' );
cp.then(function(conn){
    console.log('then1 connected');
});

    cp.then(function connected (connectionPrm) {
            console.log('- connected');
            connection = connectionPrm;
            return connection.createChannel();
    })
    .then(function channelCreated(channelLoc){
            console.log('- channel created ' );
            channel = channelLoc;

            return channel.assertQueue(
                'testQueue',
                { 'durable':false, 'exclusive':false, 'autoDelete':true }
            );
    })
    .then( function onAssertQueue( queueLoc ){
            console.log('- onAssertQueue ',queueLoc);
            queue = queueLoc;
            channel.sendToQueue(queueLoc.queue, new Buffer('test message') );
    })
    .then(null, function(err) {

        console.error('UPS! error: %s', err);

        // try{ channel.close(); } catch(e){}
        // try{ connection.close(); } catch(e){}

    });