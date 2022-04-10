# object-monitor [![Build Status](https://travis-ci.org/cepharum/object-monitor.svg?branch=master)](https://travis-ci.org/cepharum/object-monitor)

A NodeJS module for monitoring change of object properties.


## License

[MIT](LICENSE)

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

## Type coercion

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
		"someObject.subProperty": ( value, label ) => `deep change of ${label} to "${value}"`,
		"*.deepSub": ( value, label ) => `value of ${label} is now "${value}"`,
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

## Relax monitoring

By default an object monitor instance is throwing exception when trying to change a previously changed property of monitored object without saving first. Using constructor arguments it is possible to permanently prevent this detection or replace the exception with a warning message logged on stderr.

Starting with v0.0.8 a new context method is available for disabling this detection temporarily, only.

```javascript
const Monitor = require( "object-monitor" );

let data = {
    someObject: {
        subProperty: "its value",
    },
};

// create monitor on some data object
const monitor = Monitor( data, { recursive: true } );

console.log( monitor.someObject.subProperty ); // -> "its value"

// change once ...
monitor.someObject.subProperty = "new value";
console.log( monitor.someObject.subProperty ); // -> "new value"

// change again ...
monitor.someObject.subProperty = "newer value"; // THROWS!
console.log( monitor.someObject.subProperty ); // -> still "new value"

// relax
monitor.$context.relax();

// try changing again ...
monitor.someObject.subProperty = "newer value";
console.log( monitor.someObject.subProperty ); // -> "newer value"

// stop relaxing
monitor.$context.relax( false );

// change again ...
monitor.someObject.subProperty = "newest value"; // THROWS!
console.log( monitor.someObject.subProperty ); // -> still "newer value"
```

## Cloning monitor

Starting with v0.8.0 you can create a clone of any monitored object resulting in a deep clone of monitored data which is observed by another monitor that's starting with the same list of existing changes.

```javascript
const Monitor = require( "object-monitor" );

let data = {
    someObject: {
        subProperty: "its value",
    },
};

// create monitor on some data object
const monitor = Monitor( data, { recursive: true } );

console.log( monitor.someObject.subProperty ); // -> "its value"

// change once ...
monitor.someObject.subProperty = "new value";
console.log( monitor.someObject.subProperty ); // -> "new value"

// create a clone
const clone = monitor.$context.clone();

console.log( clone.someObject.subProperty ); // -> "new value"
console.log( clone.$context.hasChanged ); // -> true

// commit the clone
clone.$context.commit();

console.log( clone.someObject.subProperty ); // -> "new value"
console.log( clone.$context.hasChanged ); // -> false

console.log( monitor.someObject.subProperty ); // -> "new value"
console.log( monitor.$context.hasChanged ); // -> true

// roll back the source
monitor.$context.rollBack();

console.log( clone.someObject.subProperty ); // -> "new value"
console.log( clone.$context.hasChanged ); // -> false

console.log( monitor.someObject.subProperty ); // -> "its value"
console.log( monitor.$context.hasChanged ); // -> false
```

## Custom comparison

Starting in v0.1, a custom callback may be provided to inspect complex data in detail:

```javascript
const Monitor = require( "object-monitor" );

const data = {
    someObject: {
        subProperty: Buffer.from( "12345" ),
    },
};

const unmanaged = Monitor( data, {
    recursive: true,
} );

const managed = Monitor( data, {
    recursive: true,
    customCompare: ( previous, assigned ) => previous.equals( assigned ),
} );

// deeply assigning w/o custom comparison works fine for scalar data and for 
// assigning identical non-scalar data
unmanaged.someObject.subProperty = data.someObject.subProperty;
console.log( unmanaged.$context.hasChanged ); // -> false

// deeply assigning w/o custom comparison may be tracked as change though inner
// value hasn't changed actually
unmanaged.someObject.subProperty = Buffer.from( "12345" );
console.log( unmanaged.$context.hasChanged ); // -> true

// deeply assigning w/ custom comparison is capable of managing those cases
managed.someObject.subProperty = Buffer.from( "12345" );
console.log( managed.$context.hasChanged ); // -> false
```

Some limitations apply:

* Custom comparison callback is invoked after applying any coercion.
* No custom comparison callback is invoked on providing identical value.
* The same applies if coercion of a given value results in identical value.

## Custom separator

The object monitor is listing names of properties that have changed recently in its context. Due to recursively tracking properties of nested objects, those names represent hierarchical path names into the top-level set of data which is monitored. These names use `.` for separating levels of hierarchy by default. Thus, an exception is thrown whenever there is a property including `.` in its name.

Starting with v0.1, the separator used can be replaced by another single character to enable use of `.` in property naming.

```javascript
const Monitor = require( "object-monitor" );

const data = {
    someObject: {
        subProperty: Buffer.from( "12345" ),
    },
};

const regular = Monitor( data, {
    recursive: true,
} );

const adjusted = Monitor( data, {
    recursive: true,
    separator: "/",
} );

regular["some.Object"] = 1; // throws
regular.someObject["sub.Property"] = 1; // throws
regular["some/Object"] = 1; // does not throw
regular.someObject["sub/Property"] = 1; // does not throw

adjusted["some.Object"] = 1; // does not throw
adjusted.someObject["sub.Property"] = 1; // does not throw
adjusted["some/Object"] = 1; // throws
adjusted.someObject["sub/Property"] = 1; // throws
```
