"use strict";

var conf    = require( './conf.js' ),
    iRabbit = require( '../iRabbit.js' )( conf ),
    when = require( 'when' );

when.all([
    iRabbit.sendQueue('testQueue', 'message for testQueue').then(
        function(res){
            console.log('--- message sent to testQueue',res);
            return res;
        }
    ),
    iRabbit.sendQueue('testQueue2', 'message for testQueue2').then(
        function(res){
            console.log('--- message sent to testQueue2',res);
            return res;
        }
    ),
    iRabbit.sendQueue('testQueue', 'message2 for testQueue').then(
        function(res){
            console.log('--- message2 sent to testQueue',res);
            return res;
        }
    )
])
.finally(function(){
    iRabbit.close();
});

