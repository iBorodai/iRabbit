module.exports = {
    rabbit : {
        connection : {
              url: 'amqp://guest:guest@localhost:5672'
        }
        , channelType:'regular' // regular | confirm

    }
/*    , mongo : {
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
        }
      , port: 8888
      , host: 'users.shop-in-box'
    }*/
};