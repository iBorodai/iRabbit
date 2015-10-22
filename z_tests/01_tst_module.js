"use strict";
var Q = require('q');

module.exports = function(a){
    var deferred = Q.defer();
    console.log('HERE IN MODULE');
    setTimeout(function(){
        console.log('resolve:'+a);
        deferred.resolve('changed_'+a);
    },1000);

     return deferred.promise;
}