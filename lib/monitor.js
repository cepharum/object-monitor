"use strict";

/**
 * @typedef {object} MonitoringContext
 * @property {boolean} hasChanged indicates if monitored object has been changed
 * @property {Map<string,*>} changed maps names of changed properties into every changed property's original value
 * @property {function():MonitoredObject} rollBack reverts any changed property to its original value (supporting daisy-chaining)
 * @property {function():MonitoredObject} commit drops any tracked changes to monitored object w/o adjusting the latter
 */

/**
 * @typedef {object} MonitoredObject
 * @property {MonitoringContext} $context
 */

/**
 * Wraps provided object in a Proxy to detect modifications of properties.
 *
 * @param {object} object data object to be monitored
 * @param {object} context explicit context to use instead of implicit one
 * @param {boolean} warn requests to log on stderr if property's recently changed value is replaced
 * @param {boolean} fail requests to throw if property's recently changed value is replaced
 * @param {boolean} recursive requests to recursively monitor values of properties set
 * @param {string} prefix requests to prepend this string to all names of changed properties tracked in context
 * @param {boolean} justOwned set false to track change of all but owned properties
 * @param {{string: function(*):*}} coercion optionally provides handler per property to coerce assigned values
 * @param {function(any, any):boolean} customCompare detects if two provided values are equivalent, used instead of ===
 * @param {string} separator separator string to use in compiling path names of hierarchical names
 * @returns {MonitoredObject} wrapped data object
 */
function monitorData( object, {
	context = null,
	warn = true,
	fail = true,
	recursive = false,
	prefix = "",
	justOwned = true,
	coercion = {},
	customCompare = null,
	separator = ".",
} = {} ) {
	let monitored; // eslint-disable-line prefer-const

	const ctx = context || Object.create( {}, {
		changed: { value: new Map() },

		/**
		 * Indicates if any property of monitored object has changed.
		 *
		 * @alias MonitoredObject#$context.hasChanged
		 * @type {boolean} true if there are changed
		 */
		hasChanged: { get: () => ctx.changed.size > 0 },

		/**
		 * Drops all changes to properties of monitored object since last commit
		 * or since starting observation of object.
		 *
		 * @alias MonitoredObject#$context.rollBack()
		 * @returns {MonitoredObject} fluent interface
		 */
		rollBack: { value() {
			const info = ctx.changed;

			// get keys of map as array (for sorting)
			let i = 0;
			const keys = new Array( info.size );
			for ( const key of info.keys() ) {
				keys[i++] = key;
			}

			// sort keys from longest to shortest path to ensure deep-first
			// processing on multiple changes in single thread of hierarchy
			keys.sort( ( l, r ) => r.length - l.length );

			for ( let ki = 0, kLength = keys.length; ki < kLength; ki++ ) {
				const key = keys[ki];
				const path = key.split( separator );
				const last = path.pop();

				let ref, pi, pLength;

				for ( pi = 0, pLength = path.length, ref = object; pi < pLength; pi++ ) {
					ref = ref[path[pi]];
				}

				ref[last] = info.get( key );
			}

			ctx.changed.clear();

			return monitored;
		} },

		/**
		 * Drops old values of monitored properties without adjusting those
		 * properties again.
		 *
		 * @alias MonitoredObject#$context.commit()
		 * @returns {MonitoredObject} fluent interface
		 */
		commit: { value() {
			ctx.changed.clear();

			return monitored;
		} },

		/**
		 * Temporarily disables logging of warning and/or throwing exceptions
		 * when assigning twice without committing intermittently.
		 *
		 * @alias MonitoredObject#$context.relax()
		 * @param {boolean} relaxed set true to start relaxing, set false to end
		 * @returns {MonitoredObject} fluent interface
		 */
		relax: { value( relaxed = true ) {
			ctx.relaxed = Boolean( relaxed );

			return monitored;
		} },

		/**
		 * Creates clone of current monitor and its observed object.
		 *
		 * @alias MonitoredObject#$context.clone()
		 * @param {boolean} recursive set true to clone observed object recursively
		 * @param {function} cloneFn use this callback instead of internal one for deeply cloning object
		 * @returns {MonitoredObject} clone of monitor
		 */
		clone: { value( { recursive: cloneRecursively = true, cloneFn = null } = {} ) {
			let dataClone;

			if ( cloneFn ) {
				dataClone = cloneFn( monitored );
			} else {
				dataClone = createClone.call( monitored, monitored, cloneRecursively );
			}

			const _clone = monitorData( dataClone, {
				recursive,
				warn,
				fail,
				prefix,
				justOwned,
				coercion,
				customCompare,
				separator,
			} );

			for ( const [ key, value ] of ctx.changed ) {
				_clone.$context.changed.set( key, value );
			}

			_clone.$context.relaxed = ctx.relaxed;

			return _clone;
		} },
	} );

	monitored = new Proxy( object, {
		recursive,
		warn,
		fail,
		prefix,
		justOwned,
		ctx,
		coercion,
		customCompare,
		separator,
		get: _get,
		set: _set,
	} );

	return monitored;
}

/**
 * Implements trap for reading properties from wrapped object.
 *
 * This is used to expose context used to list changed properties under special
 * property named `$context`.
 *
 * @param {object} target monitored object
 * @param {string} name name of property to read from monitored object
 * @returns {*} value of read property
 * @private
 */
function _get( target, name ) {
	if ( name === "$context" ) {
		return this.ctx;
	}

	if ( typeof name === "string" && name.indexOf( this.separator ) > -1 ) {
		throw new TypeError( `monitoring properties w/ '${this.separator}' in name rejected` );
	}


	// pass the action
	let value = target[name];

	if ( this.recursive && ( !this.justOwned || target.hasOwnProperty( name ) || Array.isArray( value ) ) ) {
		// ensure to monitor the returned value, too
		switch ( typeof value ) {
			case "object" :
			case "function" :
				if ( value && !value.$context ) {
					value = monitorData( value, {
						recursive: true,
						warn: this.warn,
						fail: this.fail,
						prefix: this.prefix + name + this.separator,
						justOwned: this.justOwned,
						context: this.ctx,
						coercion: this.coercion,
						customCompare: this.customCompare,
						separator: this.separator,
					} );
				}
		}
	}

	return value;
}

/**
 * Implements trap for changing properties of wrapped object.
 *
 * This is used to track changed properties in special context of wrapper.
 *
 * @param {object} target wrapped object
 * @param {string} name name of property to change
 * @param {*} value new value of property to be changed
 * @returns {boolean} false to cause TypeError
 * @private
 */
function _set( target, name, value ) {
	if ( target[name] === value ) {
		return true;
	}

	if ( name.indexOf( this.separator ) > -1 ) {
		throw new TypeError( `monitoring properties w/ '${this.separator}' in name rejected` );
	}

	if ( name !== "$context" ) {
		// track change
		const label = this.prefix + name;

		if ( !this.justOwned || target.hasOwnProperty( name ) || !( name in target ) ) {
			if ( typeof this.coercion[label] === "function" ) {
				value = this.coercion[label]( value, label ); // eslint-disable-line no-param-reassign
			} else if ( typeof this.coercion["*." + name] === "function" ) {
				value = this.coercion["*." + name]( value, label ); // eslint-disable-line no-param-reassign
			} else if ( typeof this.coercion["*"] === "function" ) {
				value = this.coercion["*"]( value, label ); // eslint-disable-line no-param-reassign
			}

			// ignore unless coerced value is actually changing current value of target
			const sameValue = typeof this.customCompare === "function" ? this.customCompare( target[name], value, label ) : target[name] === value;

			if ( !sameValue ) {
				const context = this.ctx;

				if ( context.changed.has( label ) ) {
					if ( !context.relaxed && !( Array.isArray( target ) && name === "length" ) ) {
						const message = `WARNING: replacing previously changed property ${label} w/o prior saving`;

						if ( this.warn ) {
							console.error( message ); // eslint-disable-line no-console
						}

						if ( this.fail ) {
							throw new Error( message );
						}
					}
				} else {
					context.changed.set( label, target[name] );
					if ( !context.hasChanged ) {
						Object.defineProperty( context, "hasChanged", { value: true, configurable: true } );
					}
				}

				switch ( typeof value ) {
					case "object" :
					case "function" :
						if ( value && this.recursive ) {
							value = monitorData( value, { // eslint-disable-line no-param-reassign
								recursive: true,
								warn: this.warn,
								fail: this.fail,
								prefix: label + this.separator,
								justOwned: this.justOwned,
								context,
								coercion: this.coercion,
								customCompare: this.customCompare,
								separator: this.separator,
							} );
						}
				}
			}
		}

		// pass actual action
		target[name] = value; // eslint-disable-line no-param-reassign

		return true;
	}

	// do not support adjusting property $context, but throw exception
	return false;
}

/**
 * Creates clone of provided data.
 *
 * @param {*} data data to be cloned
 * @param {boolean} recursive set true to clone provided data recursive
 * @returns {*} clone of provided data
 */
function createClone( data, recursive = true ) {
	if ( !data || typeof data !== "object" ) {
		return data;
	}

	if ( data instanceof Date ) {
		return new Date( data );
	}

	if ( typeof data.clone === "function" ) {
		return data.clone( recursive );
	}

	if ( data instanceof Map ) {
		const clone = new Map();

		for ( const key of data.keys() ) {
			clone.set( key, recursive ? createClone( data.get( key ), recursive ) : data.get( key ) );
		}

		return clone;
	}

	if ( data instanceof Set ) {
		const clone = new Set();

		for ( const value of data.values() ) {
			clone.add( recursive ? createClone( value, recursive ) : value );
		}

		return clone;
	}

	if ( data instanceof Array ) {
		const length = data.length;
		const clone = new Array( length );

		for ( let i = 0; i < length; i++ ) {
			clone[i] = recursive ? createClone( data[i], recursive ) : data[i];
		}

		return clone;
	}

	const names = Object.keys( data );
	const length = names.length;
	const isOwn = Object.hasOwnProperty;
	const proto = isOwn.call( data, "constructor" ) || isOwn.call( data, "__proto__" ) ? {} : data.constructor.prototype || {};
	const clone = Object.create( proto );

	for ( let i = 0; i < length; i++ ) {
		const name = names[i];

		switch ( name ) {
			case "constructor" :
			case "prototype" :
			case "__proto__" :
			case "$context" :
				break;

			default : {
				clone[name] = recursive ? createClone( data[name], recursive ) : data[name];
			}
		}
	}

	return clone;
}


module.exports = monitorData;

Object.defineProperties( monitorData, { createClone: { value: createClone } } );
