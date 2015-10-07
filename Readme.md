iRabbit
=======

Easy interface working with RabbitMQ for nodeJS projects.

* It's based on [amqp](https://github.com/postwait/node-amqp) RabbitMQ client.
* It's implements promises interface.

Usage
-----

```node
    //init iRabbit
    var rabbit = require( "iRabbit" )(<CONFIG-OBJECT>);

    //init and subscribe queue
    rabbit = initAndSubscribeQueue({
        '<QUEUE_NAME>'
      , {   //this block optional
            // init queue options object (see details on [amqp queue doc](https://github.com/postwait/node-amqp#connectionqueuename-options-opencallback) )
            init: {}
            // subscribe queue options object (see details on [amqp subscribe doc](https://github.com/postwait/node-amqp#queuesubscribeoptions-listener))
          , subscribe: {}
        }
    }).then();
```