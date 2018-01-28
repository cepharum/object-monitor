# object-monitor

A NodeJS module for monitoring change of object properties.


## License

MIT

## Installation

```
npm install --save object-monitor
```

## Usage

```javascript
const Monitor = require( "object-monitor" );

let data = {
    someObject: {
        subProperty: "its value",
    },
};

// create monitor on some data object
const monitor = Monitor( data, { recursive: true } );

// inspect monitoring context
console.log( monitor.$context.hasChanged ); // -> false
console.log( monitor.someObject.subProperty ); // -> "its value"

// add another property
monitor.someString = "another info";

// inspect monitoring context again
console.log( monitor.$context.hasChanged ); // -> true
console.log( monitor.$context.changed.has( "someString" ) ); // -> true
for ( let key of monitor.$context.changed.keys() ) {
    console.log( key ); // -> someString
}

// replace some existing nested property
monitor.someObject.subProperty = "new value";

// original value is tracked in monitoring context
console.log( monitor.$context.changed.get( "someObject.subProperty" ) ); // -> "its value"

// revert all changes (or try committing instead)
monitor.$context.rollBack();

// inspect monitoring context again
console.log( monitor.$context.hasChanged ); // -> false

// changed property has been reverted
console.log( monitor.someObject.subProperty ); // -> "its value"
```
