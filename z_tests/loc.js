"use strict";

var Q    = require( 'q' );

function testShow(){
    var rs = Q.defer();
    setTimeout(function(){
        rs.resolve(true);
    },500);
    return rs.promise;
}

function testCall( loc ){
    (function (locAAA) {
        testShow().then(function(){ console.log(locAAA) });
    }(loc));
}

var aaa='firstValue';

testCall( aaa );

    aaa='secondValue';
testCall( aaa );

    aaa='!!!!!!!!!!!!';
testCall( aaa );

/*(function (aaa) {
    testShow().then(function(){
        console.log(aaa);
    })
}(aaa));*/