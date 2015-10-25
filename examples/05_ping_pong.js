"use strict";

/**
 * USAGE: run process twice
 * node 05_ping_pong.js pong
 * node 05_ping_pong.js ping
 * console putput should display passing data from ping to pond and in another way as loop
 */

var conf    = require( './conf.js' ),
    when = require( 'when' ),
    iRabbit = require( '../iRabbit.js' )( conf );

var mode = false,
    opositeMode = false,
    clientGlobal = false;

try {
  if (process.argv.length < 3) throw Error('Need args');
  mode = process.argv[2];
} catch (e) { console.error(e);process.exit(1); }
opositeMode = (mode=='ping') ? 'pong' : 'ping';

console.log("ping pong app\n===================");
console.log(' - mode', mode);

when.all([
    iRabbit.rpcTopicServer(
        'pingPongExchange',
        'ping.pong.'+mode,
        function( incMsg ){
            console.log('[->server]', incMsg.message);
            var response = incMsg.message;
            if( response.length > 100 ) response = mode;

            setTimeout(function(){
                console.log('[client->]',response+'-'+mode);
                clientGlobal.send('ping.pong.'+opositeMode, response+'-'+mode)
                .then(function(resp){
                    console.log('[client<-]', resp.message);
                });
            },1000);
            console.log('[server->]',response+'-...');
            return response+'-...';
        }
    ).then(function(res){
        console.log(' - created server');
        return res;
    }),

    iRabbit.rpcTopicClient('pingPongExchange').then(function(client){
        console.log(' - created client');
        return client;
    })

]).then(function(results){

    clientGlobal = results[1];

    if( mode == 'ping' ){

        console.log('[i] ping is first - send message ', 'ping.pong.'+opositeMode, mode);

        // setTimeout(function(){
            console.log('sending first mesage');
            clientGlobal.send('ping.pong.'+opositeMode, mode)
            .then(function(resp){
                console.log('[->]',resp.message);
            }).catch(console.wrn);
        // },3000);

    }

}).catch(function(err){
    console.log('THE_ERROR!!!', err);
});