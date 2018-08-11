# object-monitor [![Build Status](https://travis-ci.org/cepharum/object-monitor.svg?branch=master)](https://travis-ci.org/cepharum/object-monitor)

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

## Type Coercion

In v0.0.7 support for implicit type/value coercion handlers has been added.

```javascript
const Monitor = require( "object-monitor" );

let data = {
    someObject: {
        subProperty: "its value",
        subObject: {},
    },
};

// create monitor on some data object
const monitor = Monitor( data, {
	recursive: true,
	coercion: {
		someValue: ( value, label ) => `new value of ${label} is "${value}"`,
		"someObject.subProperty": ( value, label ) => `deep change of ${label} to "${value}"`
		"*.deepSub": ( value, label ) => `value of ${label} is now "${value}"`
		"*": ( value, label ) => `fallback value of ${label} is now "${value}"`
	},
} );

monitor.someValue = "added";
monitor.someObject.subProperty = "new value";
monitor.someObject.subObject.deepSub = "added";
monitor.someObject.subObject.anotherSub = 1000;


console.log( monitor.someValue );
// new value of someValue is "added"

console.log( monitor.someObject.subProperty );
// deep change of someObject.subProperty to "new value"

console.log( monitor.someObject.subObject.deepSub );
// value of someObject.subObject.deepSub is now "added"

console.log( monitor.someObject.subObject.anotherSub );
// fallback value of someObject.subObject.anotherSub is now "1000"
```
