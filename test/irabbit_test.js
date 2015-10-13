/**
 * By John 28.09.2015
 */
var assert = require('assert')
  , conf = require('../z_tests/conf.js')
  , rabbit = require( "../iRabbit" )(conf.rabbit);

    describe('Irabbit', function(){

        // before(function (done) {});

        var connectionLoc = false;
        it('should connect', function( done ){
            assert.doesNotThrow(function() {
                rabbit.connect().then(function(connection){
                    assert.notEqual( rabbit.connection, null, 'rabbit.connection not set' );
                    assert.deepEqual( rabbit.connection, connection , 'connection not stored in object option');


                    connectionLoc = connection;
                    done();
                });
            });
        });

        it('should return same connection on double call connect', function( done ){
            assert.doesNotThrow(function() {
                rabbit.connect().then(function( connection ){
                    assert.deepEqual( connection, connectionLoc , 'connection not returns same on double call connect method');
                    assert.deepEqual( rabbit.connection, connectionLoc , 'connection not returns same on double call connect method');
                    done();
                });
            });
        });

    }); //describe