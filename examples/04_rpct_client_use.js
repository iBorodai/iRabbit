"use strict";

var client    = require( './04_rpct_client_module' );

client('x.y.z','11111').then(function(answer){ console.log('-------1111',answer.message) });
client('x.y.z','22222').then(function(answer){ console.log('-------2222',answer.message) });
client('x.y.z','33333').then(function(answer){ console.log('-------3333',answer.message) });