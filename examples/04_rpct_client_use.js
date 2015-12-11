"use strict";

var client    = require( './04_rpct_client_module' );

/*client('x.y.z','11111').then(function(answer){ console.log('-------1111',answer.message) });
client('x.y.z','22222').then(function(answer){ console.log('-------2222',answer.message) });
client('x.y.z','33333').then(function(answer){ console.log('-------3333',answer.message) });*/

function sendMessage(){

    var msg = Math.random()*1000;
    var timeOut = Math.random()*1000;

    var timer = setTimeout( function(){
        console.log('[<-]',msg);
        client('x.y.z',msg).then(function(answer){
            console.log('[->]',answer.message);
            clearTimeout( timer );
            sendMessage();
        });
    }, timeOut );

}

sendMessage();