"use strict";

var scheme = [
      { name:'optionsFrom'  }
    , { name:'callback', type:'function', position:'last', def:function(){} }
    , { name:'error', type:'Error', position:'first'}
    , { name:'optionsTo' }
];
/**
 * {
 *     first : {}
 *     last : {}
 * }
 * @param  {[type]} argsPrm [description]
 * @param  {[type]} options [description]
 * @return {[type]}         [description]
 */
function populateArgs( argsPrm, scheme ){
    scheme.sort( sortScheme );
}

var scheme1 = scheme.sort( sortScheme );
console.log( scheme1 );

function sortScheme(a, b){
        // console.log(a.position, b.position);
        // a меньше, чем b по некоторому критерию
        if(
            ( typeof(a.position != 'undefined') && typeof(b.position == 'undefined') )
            /*|| (
                typeof(a.position)!='undefined' && a.position=='first' && ( typeof(b.position)=='undefined' || b.position!='first' )
            )*/
        ){
            return -1; // Или любое число, меньшее нуля
        }

        // a больше, чем b по некоторому критерию
        if(
            typeof(a.position == 'undefined') && typeof(b.position != 'undefined')
            /*|| (
                typeof(b.position)!='undefined' && b.position=='first' && ( typeof(a.position)=='undefined' || a.position!='first' )
            )*/
        ){
            return 1;  // Или любое число, большее нуля
        }
        // в случае а = b вернуть 0
        return 0;
    }

function example( err, optionalA, optionalB, callback ) {

    // retrieve arguments as array
    var args = [];
    for (var i = 0; i < arguments.length; i++) {
        args.push(arguments[i]);
    }

    // first argument is the error object
    // shift() removes the first item from the
    // array and returns it
    err = args.shift();

    // last argument is the callback function.
    // pop() removes the last item in the array
    // and returns it
    callback = args.pop();

    // if args still holds items, these are
    // your optional items which you could
    // retrieve one by one like this:
    if (args.length > 0) optionalA = args.shift(); else optionalA = null;
    if (args.length > 0) optionalB = args.shift(); else optionalB = null;

    // continue as usual: check for errors
    if (err) return callback(err);

    // for tutorial purposes, log the optional parameters
    console.log('optionalA:', optionalA);
    console.log('optionalB:', optionalB);

    /* do your thing */

}