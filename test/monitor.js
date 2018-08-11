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

const { describe, it, beforeEach } = require( "mocha" );
const Should = require( "should" );

const Monitor = require( "../" );


describe( "Utility's Monitor", function() {
	it( "is a function", function() {
		Should( Monitor ).be.Function().which.is.length( 1 );
	} );

	it( "requires object as first argument", function() {
		( () => Monitor() ).should.throw();
		( () => Monitor( undefined ) ).should.throw();
		( () => Monitor( null ) ).should.throw();
		( () => Monitor( false ) ).should.throw();
		( () => Monitor( true ) ).should.throw();
		( () => Monitor( 1 ) ).should.throw();
		( () => Monitor( -5.4 ) ).should.throw();
		( () => Monitor( undefined, {} ) ).should.throw();
		( () => Monitor( null, {} ) ).should.throw();
		( () => Monitor( false, {} ) ).should.throw();
		( () => Monitor( true, {} ) ).should.throw();
		( () => Monitor( 1, {} ) ).should.throw();
		( () => Monitor( -5.4, {} ) ).should.throw();

		( () => Monitor( {} ) ).should.not.throw();
		( () => Monitor( [] ) ).should.not.throw();
		( () => Monitor( function() {} ) ).should.not.throw(); // eslint-disable-line no-empty-function
		( () => Monitor( new Set() ) ).should.not.throw();
	} );

	it( "accepts configuration object as second argument", function() {
		( () => Monitor( {}, {} ) ).should.not.throw();
	} );

	describe( "returns object which", function() {
		let data;

		beforeEach( function() {
			data = {
				someObject: { theObject: "set" },
				someFunction: function() {}, // eslint-disable-line no-empty-function
				someArray: [],
				someSet: new Set(),
				someInteger: 1000,
				someBoolean: false,
			};
		} );

		it( "is IDENTICIAL to given one", function() {
			const monitored = Monitor( data );

			monitored.should.be.Object().and.equal( data );
		} );

		it( "is exposing monitoring context as virtual property", function() {
			const monitored = Monitor( data );

			// it's a "virtual" property (thus can't be enumerated/tested)
			data.should.not.have.property( "$context" );
			monitored.should.not.have.property( "$context" );

			// is available for access in monitored version nonetheless
			Should( data.$context ).be.Undefined();
			Should( monitored.$context ).not.be.Undefined();
			monitored.$context.should.be.Object().which.is.ok();
			monitored.$context.should.have.property( "changed" ).which.is.empty();
			monitored.$context.should.have.property( "hasChanged" ).which.is.false();
			monitored.$context.should.have.property( "rollBack" ).which.is.a.Function().and.has.length( 0 );
			monitored.$context.should.have.property( "commit" ).which.is.a.Function().and.has.length( 0 );
		} );

		it( "is NOT exposing monitoring context on properties with object-like values by default", function() {
			const monitored = Monitor( data );

			// it's a "virtual" property (thus can't be enumerated/tested)
			data.should.not.have.property( "$context" );
			monitored.should.not.have.property( "$context" );
			data.someObject.should.not.have.property( "$context" );
			monitored.someObject.should.not.have.property( "$context" );

			// is available for access in monitored version nonetheless
			Should( data.$context ).be.Undefined();
			Should( monitored.$context ).not.be.Undefined();
			monitored.$context.should.be.Object().which.is.ok();
			monitored.$context.should.have.property( "changed" ).which.is.empty();
			monitored.$context.should.have.property( "hasChanged" ).which.is.false();
			Should( data.someObject.$context ).be.Undefined();
			Should( monitored.someObject.$context ).be.Undefined();
		} );

		it( "is exposing monitoring context on properties with object-like values on recursive monitoring", function() {
			const monitored = Monitor( data, { recursive: true } );

			// it's a "virtual" property (thus can't be enumerated/tested)
			data.should.not.have.property( "$context" );
			monitored.should.not.have.property( "$context" );
			data.someObject.should.not.have.property( "$context" );
			monitored.someObject.should.not.have.property( "$context" );

			// is available for access in monitored version nonetheless
			Should( data.$context ).be.Undefined();
			monitored.$context.should.be.Object().which.is.ok();
			monitored.$context.should.have.property( "changed" ).which.is.empty();
			monitored.$context.should.have.property( "hasChanged" ).which.is.false();
			Should( data.someObject.$context ).be.Undefined();
			monitored.someObject.$context.should.be.Object().which.is.ok();
			monitored.someObject.$context.should.have.property( "changed" ).which.is.empty();
			monitored.someObject.$context.should.have.property( "hasChanged" ).which.is.false();
		} );

		it( "is sharing IDENTICAL monitoring context with properties of monitored object on recursive monitoring", function() {
			const monitored = Monitor( data, { recursive: true } );

			monitored.$context.should.equal( monitored.someObject.$context );
		} );

		describe( "has attached monitor that", function() {
			it( "is tracking any shallow property added via monitored object in its monitoring context", function() {
				const monitored = Monitor( data );

				monitored.$context.changed.should.be.empty();
				data.firstAdded = null;
				monitored.$context.changed.should.be.empty();
				monitored.$context.hasChanged.should.be.false();
				monitored.secondAdded = null;
				monitored.$context.changed.should.not.be.empty();
				monitored.$context.changed.has( "firstAdded" ).should.be.false();
				monitored.$context.changed.has( "secondAdded" ).should.be.true();
				monitored.$context.hasChanged.should.be.true();
			} );

			it( "is tracking any shallow property adjusted via monitored object in its monitoring context", function() {
				const monitored = Monitor( data );

				monitored.$context.changed.should.be.empty();
				data.someInteger = 999;
				monitored.$context.changed.should.be.empty();
				monitored.$context.hasChanged.should.be.false();
				monitored.someInteger = 998;
				monitored.$context.changed.should.not.be.empty();
				monitored.$context.changed.has( "someInteger" ).should.be.true();
				monitored.$context.hasChanged.should.be.true();
			} );

			it( "is NOT tracking any shallow property adjusted to same value via monitored object in its monitoring context", function() {
				const monitored = Monitor( data );

				monitored.$context.changed.should.be.empty();
				data.someInteger = 1000;
				monitored.$context.changed.should.be.empty();
				monitored.$context.hasChanged.should.be.false();
				monitored.someInteger = 1000;
				monitored.$context.changed.should.be.empty();
				monitored.$context.hasChanged.should.be.false();
			} );


			it( "is tracking any deep property added via monitored object in its monitoring context", function() {
				const monitored = Monitor( data, { recursive: true } );

				monitored.$context.changed.should.be.empty();
				data.someObject.firstAdded = null;
				monitored.$context.changed.should.be.empty();
				monitored.$context.hasChanged.should.be.false();
				monitored.someObject.secondAdded = null;
				monitored.$context.changed.should.not.be.empty();
				monitored.$context.changed.has( "someObject" ).should.be.false();
				monitored.$context.changed.has( "firstAdded" ).should.be.false();
				monitored.$context.changed.has( "secondAdded" ).should.be.false();
				monitored.$context.changed.has( "someObject.firstAdded" ).should.be.false();
				monitored.$context.changed.has( "someObject.secondAdded" ).should.be.true();
				monitored.$context.hasChanged.should.be.true();
			} );

			it( "is tracking any deep property adjusted via monitored object in its monitoring context", function() {
				const monitored = Monitor( data, { recursive: true } );

				monitored.$context.changed.should.be.empty();
				data.someObject.theObject = "changed";
				monitored.$context.changed.should.be.empty();
				monitored.$context.hasChanged.should.be.false();
				monitored.someObject.theObject = "re-changed";
				monitored.$context.changed.should.not.be.empty();
				monitored.$context.changed.has( "someObject" ).should.be.false();
				monitored.$context.changed.has( "theObject" ).should.be.false();
				monitored.$context.changed.has( "someObject.theObject" ).should.be.true();
				monitored.$context.hasChanged.should.be.true();
			} );

			it( "is NOT tracking any deep property adjusted to same value via monitored object in its monitoring context", function() {
				const monitored = Monitor( data, { recursive: true } );

				monitored.$context.changed.should.be.empty();
				data.someObject.theObject = "set";
				monitored.$context.changed.should.be.empty();
				monitored.$context.hasChanged.should.be.false();
				monitored.someObject.theObject = "set";
				monitored.$context.changed.should.be.empty();
				monitored.$context.hasChanged.should.be.false();
			} );


			it( "is tracking addition of items to array in a deep property via monitored object in its monitoring context", function() {
				const monitored = Monitor( data, { recursive: true } );

				monitored.$context.changed.should.be.empty();
				data.someArray.push( "foo" );
				monitored.$context.changed.should.be.empty();
				monitored.$context.hasChanged.should.be.false();
				monitored.someArray.push( "foo" );
				monitored.$context.changed.should.not.be.empty();
				monitored.$context.changed.has( "someArray" ).should.be.false();
				monitored.$context.changed.has( "foo" ).should.be.false();
				monitored.$context.changed.has( "0" ).should.be.false();
				monitored.$context.changed.has( "1" ).should.be.false();
				monitored.$context.changed.has( "someArray.foo" ).should.be.false();
				monitored.$context.changed.has( "someArray.0" ).should.be.false();
				monitored.$context.changed.has( "someArray.1" ).should.be.true();
				monitored.$context.hasChanged.should.be.true();
			} );

			it( "is tracking removal of items from array in a deep property via monitored object in its monitoring context", function() {
				const monitored = Monitor( data, { recursive: true } );

				monitored.$context.changed.should.be.empty();
				data.someArray.push( "foo" );
				data.someArray.push( "foo" );
				monitored.$context.changed.should.be.empty();
				monitored.$context.hasChanged.should.be.false();
				monitored.someArray.shift( "foo" );
				monitored.$context.changed.should.not.be.empty();
				monitored.$context.changed.has( "someArray" ).should.be.false();
				monitored.$context.changed.has( "foo" ).should.be.false();
				monitored.$context.changed.has( "1" ).should.be.false();
				monitored.$context.changed.has( "0" ).should.be.false();
				monitored.$context.changed.has( "length" ).should.be.false();
				monitored.$context.changed.has( "someArray.foo" ).should.be.false();
				monitored.$context.changed.has( "someArray.1" ).should.be.false();
				monitored.$context.changed.has( "someArray.0" ).should.be.false();
				monitored.$context.changed.has( "someArray.length" ).should.be.true();
				monitored.$context.hasChanged.should.be.true();
			} );

			it( "is tracking alternative removal of items from array in a deep property via monitored object in its monitoring context", function() {
				const monitored = Monitor( data, { recursive: true } );

				monitored.$context.changed.should.be.empty();
				data.someArray.push( "foo" );
				data.someArray.push( "foo" );
				monitored.$context.changed.should.be.empty();
				monitored.$context.hasChanged.should.be.false();
				monitored.someArray.pop( "foo" );
				monitored.$context.changed.should.not.be.empty();
				monitored.$context.changed.has( "someArray" ).should.be.false();
				monitored.$context.changed.has( "foo" ).should.be.false();
				monitored.$context.changed.has( "1" ).should.be.false();
				monitored.$context.changed.has( "0" ).should.be.false();
				monitored.$context.changed.has( "length" ).should.be.false();
				monitored.$context.changed.has( "someArray.foo" ).should.be.false();
				monitored.$context.changed.has( "someArray.1" ).should.be.false();
				monitored.$context.changed.has( "someArray.0" ).should.be.false();
				monitored.$context.changed.has( "someArray.length" ).should.be.true();
				monitored.$context.hasChanged.should.be.true();
			} );


			describe( "supports rolling back change of monitored object, thus it", function() {
				it( "is replacing adjusted value of shallow property with original one", function() {
					const monitored = Monitor( data, { warn: false, fail: false } );
					const original = data.someObject;

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
					monitored.someObject.should.equal( original );

					monitored.someObject = { differentObject: "set" };

					monitored.$context.changed.should.not.be.empty();
					monitored.$context.changed.has( "someObject" ).should.be.true();
					monitored.$context.changed.get( "someObject" ).should.equal( original );
					monitored.$context.hasChanged.should.be.true();
					monitored.someObject.should.not.equal( original );

					monitored.someObject = { anotherObject: "set" };

					monitored.$context.changed.should.not.be.empty();
					monitored.$context.changed.has( "someObject" ).should.be.true();
					monitored.$context.changed.get( "someObject" ).should.equal( original );
					monitored.$context.hasChanged.should.be.true();
					monitored.someObject.should.not.equal( original );

					monitored.$context.rollBack();

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
					monitored.someObject.should.equal( original );
				} );

				it( "is replacing adjusted value of deep property with original one", function() {
					const monitored = Monitor( data, { warn: false, fail: false, recursive: true } );
					const original = data.someObject.theObject;

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
					monitored.someObject.theObject.should.equal( original );

					monitored.someObject.theObject = "changed";

					monitored.$context.changed.should.not.be.empty();
					monitored.$context.changed.has( "someObject.theObject" ).should.be.true();
					monitored.$context.changed.get( "someObject.theObject" ).should.equal( original );
					monitored.$context.hasChanged.should.be.true();
					monitored.someObject.theObject.should.not.equal( original );

					monitored.someObject.theObject = "re-changed";

					monitored.$context.changed.should.not.be.empty();
					monitored.$context.changed.has( "someObject.theObject" ).should.be.true();
					monitored.$context.changed.get( "someObject.theObject" ).should.equal( original );
					monitored.$context.hasChanged.should.be.true();
					monitored.someObject.theObject.should.not.equal( original );

					monitored.$context.rollBack();

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
					monitored.someObject.theObject.should.equal( original );
				} );

				// see https://github.com/google/google-api-nodejs-client/issues/375#issuecomment-76538779 on avoiding to use delete operator
				it( "is replacing added value of shallow property with `undefined`", function() {
					const monitored = Monitor( data, { warn: false, fail: false } );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
					monitored.should.not.have.property( "someAdded" );
					data.should.not.have.property( "someAdded" );

					monitored.someAdded = { newObject: "added" };

					monitored.$context.changed.should.not.be.empty();
					monitored.$context.changed.has( "someAdded" ).should.be.true();
					Should( monitored.$context.changed.get( "someAdded" ) ).be.undefined();
					monitored.$context.hasChanged.should.be.true();
					monitored.should.have.property( "someAdded" );
					data.should.have.property( "someAdded" );

					monitored.someAdded = { anotherObject: "replaced" };

					monitored.$context.changed.should.not.be.empty();
					monitored.$context.changed.has( "someAdded" ).should.be.true();
					Should( monitored.$context.changed.get( "someAdded" ) ).be.undefined();
					monitored.$context.hasChanged.should.be.true();
					monitored.should.have.property( "someAdded" );
					data.should.have.property( "someAdded" );

					monitored.$context.rollBack();

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
					// NOTE: next tests assess difference from original state
					monitored.should.have.property( "someAdded" );
					data.should.have.property( "someAdded" );
				} );

				// see https://github.com/google/google-api-nodejs-client/issues/375#issuecomment-76538779 on avoiding to use delete operator
				it( "is replacing added value of deep property with `undefined`", function() {
					const monitored = Monitor( data, { warn: false, fail: false, recursive: true } );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
					monitored.someObject.should.not.have.property( "newProperty" );
					data.someObject.should.not.have.property( "newProperty" );

					monitored.someObject.newProperty = "added";

					monitored.$context.changed.should.not.be.empty();
					monitored.$context.changed.has( "someObject.newProperty" ).should.be.true();
					Should( monitored.$context.changed.get( "someObject.newProperty" ) ).be.undefined();
					monitored.$context.hasChanged.should.be.true();
					monitored.someObject.should.have.property( "newProperty" );
					data.someObject.should.have.property( "newProperty" );

					monitored.someObject.newProperty = "replaced";

					monitored.$context.changed.should.not.be.empty();
					monitored.$context.changed.has( "someObject.newProperty" ).should.be.true();
					Should( monitored.$context.changed.get( "someObject.newProperty" ) ).be.undefined();
					monitored.$context.hasChanged.should.be.true();
					monitored.someObject.should.have.property( "newProperty" );
					data.someObject.should.have.property( "newProperty" );

					monitored.$context.rollBack();

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
					// NOTE: next tests assess difference from original state
					monitored.someObject.should.have.property( "newProperty" );
					data.someObject.should.have.property( "newProperty" );
				} );

				it( "is replacing adjusted values with original ones preferring more shallow property over deeper one changing shallow one first", function() {
					const monitored = Monitor( data, { warn: false, fail: false, recursive: true } );
					const original = data.someObject;

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();

					monitored.someObject = { newObject: "changed" };

					monitored.$context.changed.should.not.be.empty();
					monitored.$context.changed.has( "someObject" ).should.be.true();
					monitored.$context.changed.has( "someObject.theObject" ).should.be.false();
					monitored.$context.changed.has( "someObject.newObject" ).should.be.false();
					monitored.$context.hasChanged.should.be.true();

					monitored.someObject.newObject = "re-changed";

					monitored.$context.changed.should.not.be.empty();
					monitored.$context.changed.has( "someObject" ).should.be.true();
					monitored.$context.changed.has( "someObject.theObject" ).should.be.false();
					monitored.$context.changed.has( "someObject.newObject" ).should.be.true();
					monitored.$context.hasChanged.should.be.true();

					monitored.$context.rollBack();

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
					monitored.someObject.should.equal( original );
				} );

				it( "is replacing adjusted values with original ones preferring more shallow property over deeper one changing deep one first", function() {
					const monitored = Monitor( data, { warn: false, fail: false, recursive: true } );
					const original = data.someObject;

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();

					monitored.someObject.theObject = "changed";

					monitored.$context.changed.should.not.be.empty();
					monitored.$context.changed.has( "someObject" ).should.be.false();
					monitored.$context.changed.has( "someObject.theObject" ).should.be.true();
					monitored.$context.changed.has( "someObject.newObject" ).should.be.false();
					monitored.$context.hasChanged.should.be.true();

					monitored.someObject = { newObject: "re-changed" };

					monitored.$context.changed.should.not.be.empty();
					monitored.$context.changed.has( "someObject" ).should.be.true();
					monitored.$context.changed.has( "someObject.theObject" ).should.be.true();
					monitored.$context.changed.has( "someObject.newObject" ).should.be.false();
					monitored.$context.hasChanged.should.be.true();

					monitored.$context.rollBack();

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
					monitored.someObject.should.equal( original );
				} );

				it( "is replacing added values with `undefined` preferring addition of more shallow property over deeper one", function() {
					const monitored = Monitor( data, { warn: false, fail: false, recursive: true } );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
					monitored.should.not.have.property( "someAdded" );
					data.should.not.have.property( "someAdded" );

					monitored.someAdded = { theObject: "added" };

					monitored.$context.changed.should.not.be.empty();
					monitored.$context.changed.has( "someAdded" ).should.be.true();
					monitored.$context.changed.has( "someAdded.newObject" ).should.be.false();
					monitored.$context.hasChanged.should.be.true();

					monitored.someAdded.newObject = "added, too";

					monitored.$context.changed.should.not.be.empty();
					monitored.$context.changed.has( "someAdded" ).should.be.true();
					monitored.$context.changed.has( "someAdded.newObject" ).should.be.true();
					monitored.$context.hasChanged.should.be.true();

					monitored.$context.rollBack();

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();

					// NOTE: next tests assess difference from original state
					monitored.should.have.property( "someAdded" );
					data.should.have.property( "someAdded" );
				} );
			} );

			describe( "supports committing change of monitored object and thus it", function() {
				it( "is keeping adjusted value of shallow property", function() {
					const monitored = Monitor( data, { warn: false, fail: false } );
					const original = data.someObject;

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
					monitored.someObject.should.equal( original );

					monitored.someObject = { differentObject: "set" };

					monitored.$context.changed.should.not.be.empty();
					monitored.$context.changed.has( "someObject" ).should.be.true();
					monitored.$context.changed.get( "someObject" ).should.equal( original );
					monitored.$context.hasChanged.should.be.true();
					monitored.someObject.should.not.equal( original );

					monitored.someObject = { anotherObject: "set" };

					monitored.$context.changed.should.not.be.empty();
					monitored.$context.changed.has( "someObject" ).should.be.true();
					monitored.$context.changed.get( "someObject" ).should.equal( original );
					monitored.$context.hasChanged.should.be.true();
					monitored.someObject.should.not.equal( original );

					monitored.$context.commit();

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
					monitored.someObject.should.not.equal( original );
				} );

				it( "is keeping adjusted value of deep property", function() {
					const monitored = Monitor( data, { warn: false, fail: false, recursive: true } );
					const original = data.someObject.theObject;

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
					monitored.someObject.theObject.should.equal( original );

					monitored.someObject.theObject = "changed";

					monitored.$context.changed.should.not.be.empty();
					monitored.$context.changed.has( "someObject.theObject" ).should.be.true();
					monitored.$context.changed.get( "someObject.theObject" ).should.equal( original );
					monitored.$context.hasChanged.should.be.true();
					monitored.someObject.theObject.should.not.equal( original );

					monitored.someObject.theObject = "re-changed";

					monitored.$context.changed.should.not.be.empty();
					monitored.$context.changed.has( "someObject.theObject" ).should.be.true();
					monitored.$context.changed.get( "someObject.theObject" ).should.equal( original );
					monitored.$context.hasChanged.should.be.true();
					monitored.someObject.theObject.should.not.equal( original );

					monitored.$context.commit();

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
					monitored.someObject.theObject.should.not.equal( original );
				} );

				it( "is keeping added value of shallow property", function() {
					const monitored = Monitor( data, { warn: false, fail: false } );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
					monitored.should.not.have.property( "someAdded" );
					data.should.not.have.property( "someAdded" );

					monitored.someAdded = { newObject: "added" };

					monitored.$context.changed.should.not.be.empty();
					monitored.$context.changed.has( "someAdded" ).should.be.true();
					Should( monitored.$context.changed.get( "someAdded" ) ).be.undefined();
					monitored.$context.hasChanged.should.be.true();
					monitored.should.have.property( "someAdded" );
					data.should.have.property( "someAdded" );

					monitored.someAdded = { anotherObject: "replaced" };

					monitored.$context.changed.should.not.be.empty();
					monitored.$context.changed.has( "someAdded" ).should.be.true();
					Should( monitored.$context.changed.get( "someAdded" ) ).be.undefined();
					monitored.$context.hasChanged.should.be.true();
					monitored.should.have.property( "someAdded" );
					data.should.have.property( "someAdded" );

					monitored.$context.commit();

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
					monitored.should.have.property( "someAdded" ).which.is.not.undefined();
					data.should.have.property( "someAdded" ).which.is.not.undefined();
				} );

				it( "is keeping added value of deep property", function() {
					const monitored = Monitor( data, { warn: false, fail: false, recursive: true } );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
					monitored.someObject.should.not.have.property( "newProperty" );
					data.someObject.should.not.have.property( "newProperty" );

					monitored.someObject.newProperty = "added";

					monitored.$context.changed.should.not.be.empty();
					monitored.$context.changed.has( "someObject.newProperty" ).should.be.true();
					Should( monitored.$context.changed.get( "someObject.newProperty" ) ).be.undefined();
					monitored.$context.hasChanged.should.be.true();
					monitored.someObject.should.have.property( "newProperty" );
					data.someObject.should.have.property( "newProperty" );

					monitored.someObject.newProperty = "replaced";

					monitored.$context.changed.should.not.be.empty();
					monitored.$context.changed.has( "someObject.newProperty" ).should.be.true();
					Should( monitored.$context.changed.get( "someObject.newProperty" ) ).be.undefined();
					monitored.$context.hasChanged.should.be.true();
					monitored.someObject.should.have.property( "newProperty" );
					data.someObject.should.have.property( "newProperty" );

					monitored.$context.commit();

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
					monitored.someObject.should.have.property( "newProperty" ).which.is.not.undefined();
					data.someObject.should.have.property( "newProperty" ).which.is.not.undefined();
				} );
			} );

			describe( "provides set of coercion handlers that", () => {
				it( "may be omitted", () => {
					Monitor( data );
				} );

				it( "can be provided", () => {
					Monitor( data, { coercion: {} } );
				} );

				it( "is obeyed on containing function associated with path name of adjusted property", () => {
					const monitored = Monitor( data, { coercion: {
						someInteger: value => String( value ),
					} } );

					monitored.someInteger = 2000;

					monitored.someInteger.should.be.a.String().and.equal( "2000" );
				} );

				it( "is NOT obeyed on re-assigning existing value of selected property", () => {
					const monitored = Monitor( data, { coercion: {
						someInteger: value => String( value ),
					} } );

					monitored.someInteger = 1000;

					monitored.someInteger.should.be.a.Number().and.equal( 1000 );
				} );

				it( "is NOT obeyed on missing function exactly associated with path name of adjusted property", () => {
					const monitored = Monitor( data, { coercion: {
						someInteger: value => String( value ),
					} } );

					monitored.someDifferentInteger = 3000;

					monitored.someDifferentInteger.should.be.a.Number().and.equal( 3000 );
				} );

				it( "must provide handler with full path name of adjusted property", () => {
					const monitored = Monitor( data, { coercion: {
						theObject: value => "simple: " + value,
						"someObject.theObject": value => "full path: " + value,
					}, recursive: true } );

					monitored.theObject = "added";
					monitored.someObject.theObject = "updated";

					monitored.theObject.should.be.a.String().and.equal( "simple: added" );
					monitored.someObject.theObject.should.be.a.String().and.equal( "full path: updated" );
				} );

				it( "is NOT obeyed on adjusting deep property w/ non-recursive monitor", () => {
					const monitored = Monitor( data, { coercion: {
						theObject: value => "simple: " + value,
						"someObject.theObject": value => "full path: " + value,
					}, recursive: false } );

					monitored.theObject = "added";
					monitored.someObject.theObject = "updated";

					monitored.theObject.should.be.a.String().and.equal( "simple: added" );
					monitored.someObject.theObject.should.be.a.String().and.equal( "updated" );
				} );

				it( "may use fallback handler matching last segment of adjusted property's path name, only", () => {
					const monitored = Monitor( data, { coercion: {
						theObject: value => "simple: " + value,
						"someObject.theObject": value => "full path: " + value,
						"*.theObject": value => "any level: " + value,
					}, recursive: true } );

					monitored.theObject = "added";
					monitored.someObject.theObject = "updated";
					monitored.anotherObject = {};
					monitored.anotherObject.theObject = "added";
					monitored.anotherObject.subObject = {};
					monitored.anotherObject.subObject.theObject = "added";

					monitored.theObject.should.be.a.String().and.equal( "simple: added" );
					monitored.someObject.theObject.should.be.a.String().and.equal( "full path: updated" );
					monitored.anotherObject.theObject.should.be.a.String().and.equal( "any level: added" );
					monitored.anotherObject.subObject.theObject.should.be.a.String().and.equal( "any level: added" );
				} );

				it( "is NOT implicitly obeyed on assigning complex values containing properties to be coerced", () => {
					const monitored = Monitor( data, { coercion: {
						theObject: value => "simple: " + value,
						"someObject.theObject": value => "full path: " + value,
						"*.theObject": value => "any level: " + value,
					}, recursive: true } );

					monitored.theObject = "added";
					monitored.someObject.theObject = "updated";
					monitored.anotherObject = { theObject: "added" };
					monitored.anotherObject.subObject = { theObject: "added" };

					monitored.theObject.should.be.a.String().and.equal( "simple: added" );
					monitored.someObject.theObject.should.be.a.String().and.equal( "full path: updated" );
					monitored.anotherObject.theObject.should.be.a.String().and.equal( "added" );
					monitored.anotherObject.subObject.theObject.should.be.a.String().and.equal( "added" );
				} );

				it( "may contain default handler to be obeyed if no handler is matching path name of adjusted property exactly", () => {
					const monitored = Monitor( data, { coercion: {
						someInteger: value => String( value ),
						"*": value => "fallback: " + value,
					} } );

					monitored.someInteger.should.be.a.Number().and.equal( 1000 );
					data.someInteger.should.be.a.Number().and.equal( 1000 );

					monitored.someInteger = 2000;

					monitored.someInteger.should.be.a.String().and.equal( "2000" );
					data.someInteger.should.be.a.String().and.equal( "2000" );

					monitored.someDifferentInteger = 3000;

					monitored.someDifferentInteger.should.be.a.String().and.equal( "fallback: 3000" );
					data.someDifferentInteger.should.be.a.String().and.equal( "fallback: 3000" );
				} );

				it( "may be adjusted to be obeyed afterwards", () => {
					const coercion = {};
					const monitored = Monitor( data, { warn: false, fail: false, coercion, recursive: true } );

					monitored.theObject = "added";
					monitored.someObject.theObject = "updated";
					monitored.anotherObject = {};
					monitored.anotherObject.theObject = "added";
					monitored.anotherObject.subObject = {};
					monitored.anotherObject.subObject.theObject = "added";

					monitored.theObject.should.be.a.String().and.equal( "added" );
					monitored.someObject.theObject.should.be.a.String().and.equal( "updated" );
					monitored.anotherObject.theObject.should.be.a.String().and.equal( "added" );
					monitored.anotherObject.subObject.theObject.should.be.a.String().and.equal( "added" );


					coercion.theObject = value => "simple: " + value;
					coercion["someObject.theObject"] = value => "full path: " + value;
					coercion["*.theObject"] = value => "any level: " + value;


					monitored.theObject = "updated";
					monitored.someObject.theObject = "updated again";
					monitored.anotherObject.theObject = "updated";
					monitored.anotherObject.subObject.theObject = "updated";

					monitored.theObject.should.be.a.String().and.equal( "simple: updated" );
					monitored.someObject.theObject.should.be.a.String().and.equal( "full path: updated again" );
					monitored.anotherObject.theObject.should.be.a.String().and.equal( "any level: updated" );
					monitored.anotherObject.subObject.theObject.should.be.a.String().and.equal( "any level: updated" );
				} );
			} );
		} );
	} );

	it( "monitors properties on explicit request for recursive monitoring, only", function() {
		const shallow = Monitor( {
			prop: {
				sub: "original",
			},
		}, {} );

		Should.exist( shallow.$context );
		Should.not.exist( shallow.prop.$context );

		const deep = Monitor( {
			prop: {
				sub: "original",
			},
		}, { recursive: true } );

		Should.exist( deep.$context );
		Should.exist( deep.prop.$context );
	} );

	it( "fails on replacing some previously monitored change w/o committing first", function() {
		const monitor = Monitor( { prop: "original" }, { warn: false } );

		( () => { monitor.prop = "changed"; } ).should.not.throw();
		( () => { monitor.prop = "re-changed"; } ).should.throw();

		monitor.prop.should.equal( "changed" );

		( () => { monitor.prop = "re-changed"; } ).should.throw();

		monitor.prop.should.equal( "changed" );

		monitor.$context.commit();

		( () => { monitor.prop = "re-changed"; } ).should.not.throw();

		monitor.prop.should.equal( "re-changed" );
	} );

	it( "does not fail on replacing some previously monitored change on clearing configuration property `fail`", function() {
		const monitor = Monitor( { prop: "original" }, { warn: false, fail: false } );

		( () => { monitor.prop = "changed"; } ).should.not.throw();
		( () => { monitor.prop = "re-changed"; } ).should.not.throw();

		monitor.prop.should.equal( "re-changed" );

		( () => { monitor.prop = "changed again"; } ).should.not.throw();

		monitor.prop.should.equal( "changed again" );

		monitor.$context.commit();

		( () => { monitor.prop = "changed once more"; } ).should.not.throw();

		monitor.prop.should.equal( "changed once more" );
	} );

	it( "rejects to monitor retrieval of shallow property w/ period in name", function() {
		const data = {
			"prop-w/o-period": "original",
			"prop.w/-period": "original",
		};
		const monitor = Monitor( data, { warn: false, fail: false } );

		( () => monitor["prop-w/o-period"] ).should.not.throw();
		( () => monitor["prop.w/-period"] ).should.throw();
		( () => data["prop.w/-period"] ).should.not.throw();
	} );

	it( "rejects to monitor adjustment of shallow property w/ period in name", function() {
		const data = {
			"prop-w/o-period": "original",
			"prop.w/-period": "original",
		};
		const monitor = Monitor( data, { warn: false, fail: false } );

		( () => { monitor["prop-w/o-period"] = "changed"; } ).should.not.throw();
		( () => { monitor["prop.w/-period"] = "changed"; } ).should.throw();
		( () => { data["prop.w/-period"] = "changed"; } ).should.not.throw();
	} );

	it( "rejects to monitor retrieval of shallow property w/ period in name", function() {
		const data = {
			sub: {
				"prop-w/o-period": "original",
				"prop.w/-period": "original",
			},
		};
		const monitor = Monitor( data, { warn: false, fail: false, recursive: true } );

		( () => monitor.sub["prop-w/o-period"] ).should.not.throw();
		( () => monitor.sub["prop.w/-period"] ).should.throw();
		( () => data.sub["prop.w/-period"] ).should.not.throw();
	} );

	it( "rejects to monitor adjustment of shallow property w/ period in name", function() {
		const data = {
			sub: {
				"prop-w/o-period": "original",
				"prop.w/-period": "original",
			},
		};
		const monitor = Monitor( data, { warn: false, fail: false, recursive: true } );

		( () => { monitor.sub["prop-w/o-period"] = "changed"; } ).should.not.throw();
		( () => { monitor.sub["prop.w/-period"] = "changed"; } ).should.throw();
		( () => { data.sub["prop.w/-period"] = "changed"; } ).should.not.throw();
	} );
} );
