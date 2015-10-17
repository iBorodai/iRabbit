"use strict";

function tst( obj ){
    // this.aaa = 'test';
    for( var i in obj  ){
        this[ i ] = obj[i];
    }

    test2.bind(this)();
}

var t = new tst({opt:'optVal'});

function test2(){
        console.log(this.opt);
}