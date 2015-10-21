"use strict";

var conf    = require( './conf.js' ),
    iRabbit = require( '../iRabbit.js' )( conf ),
    when = require( 'when' );

iRabbit.sendQueue('testQueue', 'message for testQueue').then(
    function(res){
        console.log('--- message sent',res);
        return res;
    }
).finally(function(){
    iRabbit.close();
});