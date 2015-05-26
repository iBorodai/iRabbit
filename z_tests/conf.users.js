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
      , callbackQueueName : 'subUsersCallbackQueue' //some name or empty for automatic name
      , topic : {
           exchangeName : 'sibCommonTopicExchange'
         , queueName : 'sibUsersTopicQueue' //for multiple consumers and distribution tasks between them
         , routingKey : '*.users.*'
          /*ack:true,
          prefetchCount: 1,*/
      }
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