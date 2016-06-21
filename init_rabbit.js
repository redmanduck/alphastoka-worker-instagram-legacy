#!/usr/bin/env node
var QUEUE_NAME = "nightking";
var initList = require('./init.json');

var amqp = require('amqplib/callback_api');
amqp.connect('amqp://localhost', function(err, conn) {
  conn.createChannel(function(err, ch) {
    var q = QUEUE_NAME;

    for(var i = 0 ; i < initList.length; i++){
        var item = initList[i];
        ch.assertQueue(q, {durable: true});
        ch.sendToQueue(q, new Buffer(JSON.stringify(item)), {persistent: true});
        console.log(" [x] Sent '" +JSON.stringify(item) +  "'!'");
    }

  });
});
