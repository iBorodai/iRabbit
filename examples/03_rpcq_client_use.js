"use strict";

var client    = require( './03_rpcq_client_module' );

/*client('11111').then(function(answer){ console.log('-------1111',answer.message) });
client('22222').then(function(answer){ console.log('-------2222',answer.message) });
client('33333').then(function(answer){ console.log('-------3333',answer.message) });*/

var timeOut = 2000;
var timeout = setTimeout(function(){

}, timeOut);

function sendMessage(){

    var msg = random()*10000;
    var timeOut = random()*10000;

    var timer = setTimeout( function(){
        console.log('[<-]',msg);
        client(msg).then(function(answer){
            console.log('[->]',answer.message);
            clearTimeout( timer );
            sendMessage();
        });
    }, timeOut );

}