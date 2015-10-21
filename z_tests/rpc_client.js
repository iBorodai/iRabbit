#!/usr/bin/env node

var amqp = require('amqplib');
var basename = require('path').basename;
var when = require('when');
var defer = when.defer;
var uuid = require('node-uuid');

// I've departed from the form of the original RPC tutorial, which
// needlessly introduces a class definition, and doesn't even
// parameterise the request.

var n;
try {
  if (process.argv.length < 3) throw Error('Too few args');
  n = parseInt(process.argv[2]);
}
catch (e) {
  console.error(e);
  console.warn('Usage: %s number', basename(process.argv[1]));
  process.exit(1);
}
var answers = {},
    channel = false;

amqp.connect('amqp://localhost').then(function(conn) {
  return when(conn.createChannel().then(function(ch) {

    channel = ch;

    function maybeAnswer(msg) {
      console.log( 'received corrId:', msg.properties.correlationId );
      if ( typeof( answers[ msg.properties.correlationId ] ) != 'undefined' ) {
        answers[ msg.properties.correlationId ].resolve(msg.content.toString());
      }
    }

    // init queue
    var ok = channel.assertQueue('', {exclusive: true})
      .then(function(qok) { return qok.queue; });
    // consume queue
    ok = ok.then(function(queue) {
      return channel.consume(queue, maybeAnswer, {noAck: true})
        .then(function() { return queue; });
    });

    return ok;
  }))
  .then(function(queue){

      makeRequest( queue, n );
      makeRequest( queue, n+5 );
      return makeRequest( queue, n+10 );

  })
  .ensure(function() { conn.close(); });
}).then(null, console.warn);

function makeRequest( queue, n ){
      var corrId = uuid();
      answers[corrId] = defer();

      console.log(' [x] Requesting fib(%d)', n);
      channel.sendToQueue('rpc_queue', new Buffer(n.toString()), {
        correlationId: corrId, replyTo: queue
      });

      answers[corrId].promise.then(function(fibN) {
        console.log(' [.] Got %d', fibN);
      });

      return answers[corrId].promise;
}