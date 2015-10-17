"use strict";

var Q = require('q'),
    util = require('util');

/*function t1(s){ return s+' t1 '; }
function t2(s){ return s+' t2 '; }

Q.resolve('Chain:').then(t1).then(t2)
.done(function(result){
    console.log( 'result:', result );
});*/

// console.log( util.inspect( Q.resolve('test1') ,  {showHidden: false, depth: null} ) );

var t = Q.resolve('test1');
console.log( typeof(t.all) );

/*for( var i in t ){
    console.log( i, typeof(t[i]) );
}*/