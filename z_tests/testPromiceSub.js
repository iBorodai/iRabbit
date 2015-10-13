"use strict";

var Q = require('q');
var storage = {};

function some1(){
    if( typeof(storage.some1)!= 'undefined' ) return storage.some1;
    var deferred = Q.defer();
    setTimeout( function () {
        console.log('--');
        deferred.resolve('some1');
    },100 );
    storage.some1 = deferred.promise;
    return storage.some1;
}

function some2(){

    return some1()
            .then(function( some1Promice ){
                var deferred = Q.defer();
                setTimeout( function () {
                    deferred.resolve('some2');
                },100 );
                return deferred.promise;
            });

}

some1().then( console.log );
some1().then( console.log );
some2().then( console.log );