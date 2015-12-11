"use strict";

var uuid = require('node-uuid')
  , when = require('when')
  ;

var stubChannel = function( connection ){
    this._parent = connection._parent;
    this.assertQueue = function( name, options ){
        this._parent.pushCalled( 'assertQueue', {name:name, options:options} );
        if( name=='' ) name = uuid();
        return when.resolve( {queue:name} );
    }
    this.assertExchange = function( name, type, options ){
        // console.log('----assertExchange');
        this._parent.pushCalled( 'assertExchange', {name:name, type:type, options:options} );
        return when.resolve( {exchange:name} );
    }
    this.consume = function( queueName, callback, options ){
        // console.log('----assertExchange');
        this._parent.pushCalled( 'consume', {queueName:queueName, callback:callback, options:options} );
        return when.resolve( {queue:queueName} );
    }
    this.sendToQueue = function(queue, content, options){
        this._parent.pushCalled( 'sendToQueue', {queue:queue, content:content, options:options} );
        return when.resolve( {queue:queue} );
    }
}

var stubConnection = function( parent ){
    this._parent = parent;

    this.createChannel=function(){
        this._parent.pushCalled('createChannel',false);
        return when.resolve( new stubChannel(this) );
    }
    this.createConfirmChannel=function(){
        this._parent.pushCalled('createConfirmChannel',false);
        return when.resolve( new stubChannel(this) );
    }
    this.close = function(){
        this._parent.pushCalled('close',false);
    }
}

module.exports = {
    // Механизм для запоминания чего было вызвано
    called:{},
    callStack:[],
    resetCalled:function(){
        // this.setCalled();
        this.called = {};
        this.callStack=[];
    },
    pushCalled:function(calledFuncName, params){
        // console.log(' --- ',calledFuncName);
        this.callStack.push({name:calledFuncName, 'params':params});
        this.setCalled(calledFuncName);
    },
    setCalled:function( item ){
        var debug = false;
        if( typeof(item)=='undefined' ){
            if( debug ) console.log('[resetCalled]');

        } else {
            if( debug ) console.log('[called]', item);
            this.called[item] = true;
        }
    },
    getCalled:function( item ){
        if( typeof( this.called[item] )!='undefined' && this.called[item]==true)
            return true;
        return false;
    },
    // Механизм для запоминания чего было вызвано - END

    connect: function( config ){
        var id = uuid();
        this.pushCalled('connect',{config:config});
        // Создать заглушку соединения
        this.connection = new stubConnection(this);
        return when.resolve( this.connection );
    },
};