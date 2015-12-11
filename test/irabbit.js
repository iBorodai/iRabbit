/**
 * By John 28.09.2015
 */
var expect = require('chai').expect
  , assert = require('assert')
  , rewire = require("rewire")
  , when = require('when')
  , sinon = require('sinon')
  , rabbitConstructor = rewire( "../iRabbit" );

require('sinon-as-promised')(when);

var conf = {
        connection : { url: 'amqp://guest:guest@localhost:5672' }
      , channelType:'regular' // regular | confirm
    }
  ;

var amqpStub = require('./AmqpStub.js');

rabbitConstructor.__set__({
    'amqp':amqpStub
});

var rabbit = false;

describe('iRabbit.constructor', function(){
    var rabbit2 = false;

    it('should create object with uuid', function( done ){
        rabbit = rabbitConstructor( conf );
        assert.equal( typeof(rabbit._uniqId), 'string', 'expected uniqId string' );
        assert.notEqual( 'match:',rabbit._uniqId.match('([a-z0-9]+-?)+'), null, 'expected uniqId cirrect format: ([a-z0-9]+-?)+ ' );
        done();
    });


    it('should return same object on double instanceation', function( done ){
        var rabbit2 = rabbitConstructor( conf );
        assert.deepEqual( rabbit2._uniqId , rabbit._uniqId , 'rabbit return different instances');
        done();
    });

    after(function (done) {
        delete rabbit2;
        done();
    });

}); //describe

describe('iRabbit.connection', function(){

        var connectionLoc = false;
        it('should connect', function( done ){
            assert.doesNotThrow(function() {
                rabbit.connect().then(function(connection){
                    assert.notEqual( rabbit.connection, null, 'rabbit.connection not set' );
                    assert.deepEqual( rabbit.connection, connection , 'connection not stored in object option');

                    assert.equal( rabbit.amqp.called.connect , true, 'amqp.connect was not called' );
                    connectionLoc = connection;
                    done();
                });
            });
        });

        it('should return same connection on double call connect', function( done ){

            assert.doesNotThrow(function() {

                rabbit.amqp.resetCalled();
                assert.deepEqual(rabbit.amqp.called, {} ,'rabbit.amqp was not refreshed');

                rabbit.connect().then(function( connection ){
                    assert.deepEqual( connection, connectionLoc , 'connection not returns same on double call connect method');
                    assert.deepEqual( rabbit.connection, connectionLoc , 'connection not returns same on double call connect method');
                    assert.deepEqual(rabbit.amqp.called, {} ,'rabbit.amqp.connect shoud not be called');
                    done();
                });
            });
        });

}); //describe

describe('iRabbit.channel', function(){

    // before(function (done) { done();});

    it('should return same channel object for different entities', function( done ){
        assert.doesNotThrow(function() {

            rabbit.amqp.resetCalled();
            assert.deepEqual(rabbit.amqp.called, {} ,'rabbit.amqp was not refreshed');

            var channelLoc = false;

            rabbit.channel( 'queue', 'firstQueue' ).then(function( channel ){
                channelLoc = channel;
                assert.equal( rabbit.amqp.getCalled('createChannel') , true, 'amqp.createChannel should be called' );

                rabbit.amqp.resetCalled();
                assert.deepEqual(rabbit.amqp.called, {} ,'rabbit.amqp was not refreshed');

                rabbit.channel( 'queue', 'anotherQueue' ).then(function( channel ){
                    assert.equal( rabbit.amqp.getCalled('createChannel') , false, 'amqp.createChannel should NOT be called' );
                    assert.equal( channel , channelLoc, 'rabbit return different channel' );
                    done();
                });
            });

        });
    });

});

describe('iRabbit.queue', function(){

    it('should create amqp queue with iRabbit default options', function( done ){
        assert.doesNotThrow(function() {

            rabbit.initQueue( 'testQueue' ).then(function( queue ){
                assert.equal( rabbit.amqp.getCalled('assertQueue') , true, 'amqp.assertQueue must samebe called' );
                assert.equal( queue.queue , 'testQueue', 'created queue must have "queue" proeprty with "testQueue" value' );
                assert.deepEqual( rabbit.amqp.callStack[0].params.options , { durable: false, exclusive: false, autoDelete: true }, 'wrong default queue options' );
                done();
            });

        });
    });

    it('should not create same queue', function( done ){
        assert.doesNotThrow(function() {

            rabbit.amqp.resetCalled();

            rabbit.initQueue( 'testQueue' ).then(function( queue ){
                assert.equal( rabbit.amqp.getCalled('assertQueue') , false, 'amqp.assertQueue must NOT be called' );
                assert.equal( queue.queue , 'testQueue', 'queue must have "queue" proeprty with "testQueue" value' );
                done();
            });

        });
    });

    it('should create amqp queue with custom options', function( done ){
        assert.doesNotThrow(function() {
            rabbit.amqp.resetCalled();
            rabbit.initQueue( 'testQueue222', {durable:true, exclusive:true} ).then(function( queue ){
                assert.equal( rabbit.amqp.getCalled('assertQueue') , true, 'amqp.assertQueue must be called' );
                assert.equal( queue.queue , 'testQueue222', 'created queue must have "queue" proeprty with "testQueue222" value' );
                assert.deepEqual( rabbit.amqp.callStack[0].params.options , { durable: true, exclusive: true, autoDelete: true }, 'wrong queue options' );
                done();
            });

        });
    });

    it('should create amqp queue with default options and deadLetterExchange', function( done ){
        assert.doesNotThrow(function() {
            rabbit.amqp.resetCalled();
            rabbit.initQueue( 'catchDeadQueue', {catchExpired:true} ).then(function( queue ){
                assert.equal( rabbit.amqp.getCalled('assertQueue') , true, 'amqp.assertQueue must be called' );
                assert.equal( queue.queue , 'catchDeadQueue', 'created queue must have "queue" proeprty with "catchDeadQueue" value' );

                var t = { durable:false,exclusive:false,autoDelete:true };
                for( var i in t ) assert.deepEqual( rabbit.amqp.callStack[0].params.options[i] , t[i], 'wrong '+i+' option' );

                assert.equal( rabbit.amqp.getCalled('assertExchange') , true, 'amqp.assertExchange must be called' );
                var defExNm = rabbit.getDefaultDeadletterExchange();
                assert.equal( rabbit.amqp.callStack[1].params.name , defExNm , rabbit.amqp.callStack[1].name+' name must be called with "'+defExNm+'" name param' );
                done();
            });

        });
    });

    it('should create amqp queue and subscribe on it', function( done ){
        assert.doesNotThrow(function() {

            rabbit.amqp.resetCalled();

            rabbit.subscribeQueue( 'queueForSubscribe' )
            .then(function( result ){
                assert.equal( rabbit.amqp.getCalled('assertQueue') , true, 'amqp.assertQueue must be called' );
                assert.equal( result.queue.queue , 'queueForSubscribe', 'created queue must have "queue" proeprty with "queueForSubscribe" value' );

                var t = { durable:false,exclusive:false,autoDelete:true };
                for( var i in t ) assert.deepEqual( rabbit.amqp.callStack[0].params.options[i] , t[i], 'wrong '+i+' option' );

                done();
            });

        });
    });

    it('should create amqp queue and send message to it', function( done ){
        assert.doesNotThrow(function() {

            // rabbit._enity={};
            rabbit.amqp.resetCalled();

            rabbit.sendQueue( 'queueForSend', 'Some test message' ).then(function( result ){
                console.log(rabbit.amqp.callStack);
                var t = {
                    'assertQueue':{name:'queueForSend'},
                    'sendToQueue':{queue:'queueForSend'}
                }
                var j=0;
                for(var i in t){
                    assert.equal( rabbit.amqp.callStack[ j ].name , i , 'must be called '+i );
                    j++;
                }
                done();
            })
        });
    });

});