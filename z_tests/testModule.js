"use strict";

var Q = require('q');


var singleton = {};

module.exports = function ( config ){
    var hashCode = makeHash( config );
    // console.log('hashCode', hashCode);

    if (singleton[hashCode]) return singleton[hashCode];
    console.log('new instance!');
    if (!(this instanceof testModule))
        return singleton[hashCode] = new testModule(config);
};

function testModule( config ){
    this.connections = {};
    this.connectionPromises = {};
}

function makeHash ( obj ) {

    var str = (typeof(obj)!='undefined') ? ( JSON.stringify( obj ) ) : '',
        hash = 0, i, chr, len;

    if (str.length == 0) return hash;

    for (i = 0, len = str.length; i < len; i++) {
        chr   = str.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};


/*testModule.prototype.connect = function( conf ){

}*/