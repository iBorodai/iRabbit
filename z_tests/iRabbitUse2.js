"use strict";

var conf    = require( './conf.js' ),
    iRabbit = require( '../iRabbit.js' )( conf.rabbit );


iRabbit.sendQueue( 'testQueue', {test1:'aaa', 'test2':'bbb'} )
.then(function( result ){
    console.log( 'result', result );
})
.catch( function(err){
    console.log('THE_ERROR', err.stack);
});
