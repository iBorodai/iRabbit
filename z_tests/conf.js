module.exports = {
    rabbit : {
        connection : {
              host: 'localhost'
            , port: 5672
            , login: 'guest'
            , password: 'guest'
            , connectionTimeout: 10000
            , authMechanism: 'AMQPLAIN'
            , vhost: '/'
            , noDelay: true
            , ssl: {
                  enabled : false
              }
        }
      , topic : {
           exchangeName : 'sibUsersTopicExchange'
         , queueName : 'sibUsersTopicQueue' //for multiple consumers and distribution tasks between them
          /*ack:true,
          prefetchCount: 1,*/
      }
/*      , rpc : {
        //client
        callbackQueueName : '',
        //server
        inQueue : 'usersRpcInQueue'
      }*/
      //, callbackQueueName : 'sibCallback'
    }
  , mongo : {
        url : "mongodb://localhost:27017/SibUsersService"
      , options : {
            'server': {
                'poolSize': 5
              //, replset: { rs_name: 'myReplicaSetName' }
              //, user: '',
              //, pass: ''
            }
        }
    }
  , server : {
        connection : {
            name : 'sibUsersServer'
            /*
          , certificate
          , key
          , formatters
          , log
          , spdy
          , version
          , handleUpgrades
          , httpsServerOptions
            */
        }
      , port: 8888
      , host: 'users.shop-in-box'
    }
};