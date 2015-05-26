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
      , callbackQueueName : 'subApiCallbackQueue', //some name or empty for automatic name
      , topic : {
           exchangeName : 'sibCommonTopicExchange'
         //, queueName : 'sibApiTopicQueue' //for multiple consumers and distribution tasks between them
          /*ack:true,
          prefetchCount: 1,*/
      }
    }
  , server : {
        connection : {
            name : 'sibApiServer'
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
      , host: 'api.shop-in-box'
    }
};