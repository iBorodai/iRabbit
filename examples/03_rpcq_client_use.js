"use strict";

var client    = require( './03_rpcq_client_module' );

client('11111').then(function(answer){ console.log('-------1111',answer.message) });
client('22222').then(function(answer){ console.log('-------2222',answer.message) });
client('33333').then(function(answer){ console.log('-------3333',answer.message) });