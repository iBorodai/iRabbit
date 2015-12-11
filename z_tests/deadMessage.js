#!/usr/bin/env node
"use strict";
// send2queue
var amqp = require('amqplib');
var when = require('when');

amqp.connect('amqp://localhost').then(function(conn) {
  // CHANNEL
  return when(conn.createChannel().then(function(ch) {

    // INIT DEADLETTER EXCHANGE - BEGIN
      var expiredRoutingKey = 'expired.test';
      var expiredExchange = 'topic_expired';
      var ok = ch.assertExchange(expiredExchange, 'topic', {durable: false, autoDelete:true});

      ok = ok.then(function() {
        return ch.assertQueue('', {exclusive: true});
      });

      ok = ok.then(function(qok) {
        var queue = qok.queue;
        return ch.bindQueue(queue, expiredExchange, expiredRoutingKey).then(function() { return queue; });
      });

      ok = ok.then(function(queue) {
        return ch.consume(queue, catchExparedMessage, {noAck: true});
      });
      // return ok.then(function() {
      //   console.log(' [*] Waiting for logs. To exit press CTRL+C.');
      // });

      function catchExparedMessage(msg) {
        console.log(" [ expired ] %s:'%s'", msg.fields.routingKey, msg.content.toString() );
      }
    // INIT DEADLETTER EXCHANGE - END

    var q = 'hello';
    var msg = 'Hello World!';

    var ok = ch.assertQueue( q, {
      durable: false,
      autoDelete:true,
      messageTtl: 30000,
      deadLetterExchange: expiredExchange,
      deadLetterRoutingKey: expiredRoutingKey
    } );

    return ok.then(function(_qok) {
      ch.sendToQueue(q, new Buffer(msg), {
        expiration:1000
      });
      console.log(" [x] Sent '%s'", msg);
      // return ch.close();
    });
  }));//.ensure(function() { conn.close(); });
}).then(null, console.warn);