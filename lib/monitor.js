/**
 * (c) 2018 cepharum GmbH, Berlin, http://cepharum.de
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2018 cepharum GmbH
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * @author: cepharum
 */

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
 * @param {object<string,function(*):*>} coercion optionally provides handler per property to coerce assigned values
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
} = {} ) {
	let monitored; // eslint-disable-line prefer-const

	const ctx = context || Object.create( {}, {
		changed: { value: new Map() },
		hasChanged: { value: false, configurable: true },
		rollBack: {
			value: function() {
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
					const path = key.split( "." );
					const last = path.pop();

					let ref, pi, pLength;

					for ( pi = 0, pLength = path.length, ref = object; pi < pLength; pi++ ) {
						ref = ref[path[pi]];
					}

					ref[last] = info.get( key );
				}

				ctx.changed.clear();
				Object.defineProperty( this, "hasChanged", { value: false, configurable: true } );

				return monitored;
			},
		},
		commit: {
			value: function() {
				ctx.changed.clear();
				Object.defineProperty( this, "hasChanged", { value: false, configurable: true } );

				return monitored;
			},
		},
	} );

	monitored = new Proxy( object, {
		recursive,
		warn,
		fail,
		prefix,
		justOwned,
		ctx,
		coercion,
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

	if ( name.indexOf( "." ) > -1 ) {
		throw new TypeError( "monitoring properties w/ period in name rejected" );
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
						prefix: this.prefix + name + ".",
						justOwned: this.justOwned,
						context: this.ctx,
						coercion: this.coercion,
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

	if ( name.indexOf( "." ) > -1 ) {
		throw new TypeError( "monitoring properties w/ period in name rejected" );
	}


	if ( name !== "$context" ) {
		// track change
		const label = this.prefix + name;

		if ( !this.justOwned || target.hasOwnProperty( name ) || !( name in target ) ) {
			const context = this.ctx;

			if ( context.changed.has( label ) ) {
				const message = `WARNING: replacing previously changed property ${label} w/o prior saving`;

				if ( this.warn ) {
					console.error( message ); // eslint-disable-line no-console
				}

				if ( this.fail ) {
					throw new Error( message );
				}
			} else {
				context.changed.set( label, target[name] );
				if ( !context.hasChanged ) {
					Object.defineProperty( context, "hasChanged", { value: true, configurable: true } );
				}
			}

			if ( typeof this.coercion[label] === "function" ) {
				value = this.coercion[label]( value );
			} else if ( typeof this.coercion["*." + name] === "function" ) {
				value = this.coercion["*." + name]( value );
			} else if ( typeof this.coercion["*"] === "function" ) {
				value = this.coercion["*"]( value );
			}

			switch ( typeof value ) {
				case "object" :
				case "function" :
					if ( value && this.recursive ) {
						value = monitorData( value, {
							recursive: true,
							warn: this.warn,
							fail: this.fail,
							prefix: label + ".",
							justOwned: this.justOwned,
							context,
							coercion: this.coercion,
						} );
					}
			}
		}

		// pass actual action
		target[name] = value;

		return true;
	}

	// pass actual action w/o any extension
	target[name] = value;

	return false;
}


module.exports = monitorData;
