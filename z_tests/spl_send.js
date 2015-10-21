#!/usr/bin/env node

var amqp = require('amqplib');
var when = require('when');

amqp.connect('amqp://localhost').then(function(conn) {
  return when(conn.createChannel().then(function(ch) {
    var q = 'hello';
    var msg = 'Hello World!';

    var ok = ch.assertQueue(q, {durable: false});
    // ok = ok.then(function(){
    //   return ch.assertQueue(q2, {durable: false});
    // });

    return ok.then(function(_qok) {
      if( ch.sendToQueue(q, new Buffer(msg)) )
        console.log(" [x] Sent to %s '%s'", q, msg);

      // ch.sendToQueue(q2, new Buffer(msg));
      // console.log(" [x] Sent to hello1 '%s'", msg);

      return ch.close();
    });
  })).ensure(function() { conn.close(); });
}).then(null, console.warn);