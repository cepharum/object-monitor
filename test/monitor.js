"use strict";

const { describe, it, beforeEach, afterEach } = require( "mocha" );
const Should = require( "should" );

const Monitor = require( "../" );


describe( "Object monitor", function() {
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

	it( "rejects to monitor retrieval of deep property w/ period in name", function() {
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

	it( "rejects to monitor adjustment of deep property w/ period in name", function() {
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

	it( "accepts to monitor retrieval of shallow property w/ period in name on declaring custom separator", function() {
		const data = {
			"prop-w/o-period": "original",
			"prop.w/-period": "original",
		};
		const monitor = Monitor( data, { warn: false, fail: false, separator: "|" } );

		( () => monitor["prop-w/o-period"] ).should.not.throw();
		( () => monitor["prop.w/-period"] ).should.not.throw();
		( () => monitor["prop|w/-period"] ).should.throw();
		( () => data["prop.w/-period"] ).should.not.throw();
	} );

	it( "accepts to monitor adjustment of shallow property w/ period in name on declaring custom separator", function() {
		const data = {
			"prop-w/o-period": "original",
			"prop.w/-period": "original",
		};
		const monitor = Monitor( data, { warn: false, fail: false, separator: "|" } );

		( () => { monitor["prop-w/o-period"] = "changed"; } ).should.not.throw();
		( () => { monitor["prop.w/-period"] = "changed"; } ).should.not.throw();
		( () => { monitor["prop|w/-period"] = "changed"; } ).should.throw();
		( () => { data["prop.w/-period"] = "changed"; } ).should.not.throw();
	} );

	it( "accepts to monitor retrieval of deep property w/ period in name on declaring custom separator", function() {
		const data = {
			sub: {
				"prop-w/o-period": "original",
				"prop.w/-period": "original",
			},
		};
		const monitor = Monitor( data, { warn: false, fail: false, recursive: true, separator: "|" } );

		( () => monitor.sub["prop-w/o-period"] ).should.not.throw();
		( () => monitor.sub["prop.w/-period"] ).should.not.throw();
		( () => monitor.sub["prop|w/-period"] ).should.throw();
		( () => data.sub["prop.w/-period"] ).should.not.throw();
	} );

	it( "accepts to monitor adjustment of deep property w/ period in name on declaring custom separator", function() {
		const data = {
			sub: {
				"prop-w/o-period": "original",
				"prop.w/-period": "original",
			},
		};
		const monitor = Monitor( data, { warn: false, fail: false, recursive: true, separator: "|" } );

		( () => { monitor.sub["prop-w/o-period"] = "changed"; } ).should.not.throw();
		( () => { monitor.sub["prop.w/-period"] = "changed"; } ).should.not.throw();
		( () => { monitor.sub["prop|w/-period"] = "changed"; } ).should.throw();
		( () => { data.sub["prop.w/-period"] = "changed"; } ).should.not.throw();
	} );

	it( "rejects to adjust property `$context`", () => {
		const data = {};
		const monitored = Monitor( data );

		( () => {
			monitored.$context = "someValue";
		} ).should.throw();
	} );

	describe( "returns proxy which", function() {
		let data;

		beforeEach( function() {
			data = {
				someObject: { theObject: "set", aNumber: 1000, deepList: ["foo"] },
				someFunction: function() {}, // eslint-disable-line no-empty-function
				someArray: ["foo"],
				someSet: new Set(),
				someInteger: 1000,
				someBoolean: false,
			};
		} );

		it( "is equivalent to given object", function() {
			const monitored = Monitor( data );

			monitored.should.be.Object().and.equal( data );
		} );

		it( "is not identical to given object", function() {
			const monitored = Monitor( data );

			( monitored === data ).should.be.false();
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

		it( "is sharing its monitoring context with monitoring of monitored object's properties", function() {
			const monitored = Monitor( data, { recursive: true } );

			monitored.$context.should.equal( monitored.someObject.$context );
		} );

		describe( "has attached monitor that", function() {
			describe( "observes shallow properties of original object and thus", () => {
				it( "is NOT tracking change by adding shallow property via original object", function() {
					const monitored = Monitor( data );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();

					data.added = null;
					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
				} );

				it( "is tracking change by adding shallow property of original object via monitor", function() {
					const monitored = Monitor( data );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();

					monitored.added = null; // addition via monitor
					monitored.$context.changed.should.not.be.empty();
					monitored.$context.changed.has( "added" ).should.be.true();
					monitored.$context.hasChanged.should.be.true();

					data.should.have.ownProperty( "added" );
				} );

				it( "is NOT tracking change by updating shallow property via original object", function() {
					const monitored = Monitor( data );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
					data.someInteger.should.be.equal( 1000 );

					data.someInteger = 999;
					data.someInteger = "1000";
					data.someInteger = 1000;
					data.someInteger = 1000;
					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
				} );

				it( "is tracking change by updating shallow property of original object via monitor", function() {
					const monitored = Monitor( data );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
					data.someInteger.should.be.equal( 1000 );

					monitored.someInteger = 999;
					monitored.$context.changed.should.not.be.empty();
					monitored.$context.changed.has( "someInteger" ).should.be.true();
					monitored.$context.hasChanged.should.be.true();

					data.someInteger.should.be.equal( 999 );
				} );

				it( "is NOT tracking change by updating shallow property via monitor using same value", function() {
					const monitored = Monitor( data );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
					data.someInteger.should.be.equal( 1000 );

					monitored.someInteger = 1000;
					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
				} );

				it( "is tracking change by updating shallow property via monitor using equivalent value", function() {
					const monitored = Monitor( data );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
					data.someInteger.should.be.equal( 1000 );

					monitored.someInteger = "1000"; // change via monitor
					monitored.$context.changed.should.not.be.empty();
					monitored.$context.changed.has( "someInteger" ).should.be.true();
					monitored.$context.hasChanged.should.be.true();

					data.someInteger.should.be.equal( "1000" );
				} );

				it( "is NOT tracking change by updating shallow property via monitor using equivalent value coerced to same value", function() {
					const monitored = Monitor( data, {
						coercion: {
							someInteger: v => parseInt( v ),
						},
					} );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
					data.someInteger.should.be.equal( 1000 );

					monitored.someInteger = "1000"; // no actual change via monitor due to coercion
					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();

					data.someInteger.should.be.equal( 1000 );
				} );

				it( "is tracking change by updating shallow property via monitor on custom comparison callback indicating different value", function() {
					const monitored = Monitor( data, {
						customCompare: ( before, now ) => Math.abs( before - now ) < 10,
					} );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
					data.someInteger.should.be.equal( 1000 );

					monitored.someInteger = 1001;
					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();

					monitored.someInteger = 990;
					monitored.$context.changed.should.not.be.empty();
					monitored.$context.hasChanged.should.be.true();
				} );

				it( "is NOT tracking change by updating shallow property via monitor with custom comparison callback which is not invoked due to values being identical", function() {
					const monitored = Monitor( data, {
						customCompare: () => false, // force values to be considered different if custom callback is invoked
					} );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
					data.someInteger.should.be.equal( 1000 );

					monitored.someInteger = 1000;
					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
				} );
			} );

			describe( "optionally observes deep properties of original object and thus", () => {
				it( "is NOT tracking change by adding deep property via original object", function() {
					const monitored = Monitor( data, { recursive: true } );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();

					data.someObject.added = null;
					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
				} );

				it( "is tracking change by adding deep property of original object via monitor", function() {
					const monitored = Monitor( data, { recursive: true } );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();

					monitored.someObject.added = null; // addition via monitor
					monitored.$context.changed.should.not.be.empty();
					monitored.$context.changed.has( "someObject.added" ).should.be.true();
					monitored.$context.hasChanged.should.be.true();
					monitored.someObject.$context.changed.should.not.be.empty();
					monitored.someObject.$context.changed.has( "someObject.added" ).should.be.true();
					monitored.someObject.$context.hasChanged.should.be.true();

					data.someObject.should.have.ownProperty( "added" );
				} );

				it( "is NOT tracking change by updating deep property via original object", function() {
					const monitored = Monitor( data, { recursive: true } );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
					data.someObject.aNumber.should.be.equal( 1000 );

					data.someObject.aNumber = 999;
					data.someObject.aNumber = "1000";
					data.someObject.aNumber = 1000;
					data.someObject.aNumber = 1000;
					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
				} );

				it( "is tracking change by updating deep property of original object via monitor", function() {
					const monitored = Monitor( data, { recursive: true } );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
					data.someObject.aNumber.should.be.equal( 1000 );

					monitored.someObject.aNumber = 999;
					monitored.$context.changed.should.not.be.empty();
					monitored.$context.changed.has( "someObject.aNumber" ).should.be.true();
					monitored.$context.hasChanged.should.be.true();
					monitored.someObject.$context.changed.should.not.be.empty();
					monitored.someObject.$context.changed.has( "someObject.aNumber" ).should.be.true();
					monitored.someObject.$context.hasChanged.should.be.true();

					data.someObject.aNumber.should.be.equal( 999 );
				} );

				it( "is NOT tracking change by updating deep property via monitor using same value", function() {
					const monitored = Monitor( data, { recursive: true } );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
					data.someObject.aNumber.should.be.equal( 1000 );

					monitored.someObject.aNumber = 1000;
					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
				} );

				it( "is tracking change by updating deep property via monitor using equivalent value", function() {
					const monitored = Monitor( data, { recursive: true } );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
					data.someObject.aNumber.should.be.equal( 1000 );

					monitored.someObject.aNumber = "1000"; // change via monitor
					monitored.$context.changed.should.not.be.empty();
					monitored.$context.changed.has( "someObject.aNumber" ).should.be.true();
					monitored.$context.hasChanged.should.be.true();
					monitored.someObject.$context.changed.should.not.be.empty();
					monitored.someObject.$context.changed.has( "someObject.aNumber" ).should.be.true();
					monitored.someObject.$context.hasChanged.should.be.true();

					data.someObject.aNumber.should.be.equal( "1000" );
				} );

				it( "is NOT tracking change by updating deep property via monitor using equivalent value coerced to same value", function() {
					const monitored = Monitor( data, {
						recursive: true,
						coercion: {
							"someObject.aNumber": v => parseInt( v ),
						},
					} );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
					data.someObject.aNumber.should.be.equal( 1000 );

					monitored.someObject.aNumber = "1000"; // no actual change via monitor due to coercion
					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();

					data.someObject.aNumber.should.be.equal( 1000 );
				} );

				it( "is tracking change by updating deep property via monitor on custom comparison callback indicating different value", function() {
					const monitored = Monitor( data, {
						recursive: true,
						customCompare: ( before, now ) => Math.abs( before - now ) < 10,
					} );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
					data.someObject.aNumber.should.be.equal( 1000 );

					monitored.someObject.aNumber = 1001;
					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();

					monitored.someObject.aNumber = 990;
					monitored.$context.changed.should.not.be.empty();
					monitored.$context.hasChanged.should.be.true();
					monitored.someObject.$context.changed.should.not.be.empty();
					monitored.someObject.$context.changed.has( "someObject.aNumber" ).should.be.true();
					monitored.someObject.$context.hasChanged.should.be.true();
				} );

				it( "is NOT tracking change by updating deep property via monitor with custom comparison callback which is not invoked due to values being identical", function() {
					const monitored = Monitor( data, {
						recursive: true,
						customCompare: () => false, // force values to be considered different if custom callback is invoked
					} );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
					data.someObject.aNumber.should.be.equal( 1000 );

					monitored.someObject.aNumber = 1000;
					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
				} );
			} );

			describe( "observes arrays in shallow properties and thus", () => {
				it( "is NOT tracking addition or removal of items to/from such an array via original object", function() {
					const monitored = Monitor( data, { recursive: true } );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();

					data.someArray.push( "foo" );
					data.someArray.pop( "foo" );
					data.someArray.unshift( "foo" );
					data.someArray.shift( "foo" );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
				} );

				it( "is tracking addition of items to such an array via monitor", function() {
					const monitored = Monitor( data, { recursive: true } );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();

					monitored.someArray.push( "foo" );
					monitored.$context.changed.should.not.be.empty();
					monitored.$context.hasChanged.should.be.true();
					[...monitored.$context.changed.keys()].should.be.deepEqual( ["someArray.1"] );

					monitored.someArray.unshift( "foo" );
					monitored.$context.changed.should.not.be.empty();
					monitored.$context.hasChanged.should.be.true();
					[...monitored.$context.changed.keys()].should.be.deepEqual( [ "someArray.1", "someArray.2" ] );
				} );

				it( "is tracking removal of items from such an array via monitor", function() {
					const monitored = Monitor( data, { recursive: true } );

					data.someArray.push( "foo" );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();

					monitored.someArray.pop( "foo" );
					monitored.$context.changed.should.not.be.empty();
					monitored.$context.hasChanged.should.be.true();
					[...monitored.$context.changed.keys()].should.be.deepEqual( ["someArray.length"] );

					monitored.someArray.shift( "foo" );
					monitored.$context.changed.should.not.be.empty();
					monitored.$context.hasChanged.should.be.true();
					[...monitored.$context.changed.keys()].should.be.deepEqual( ["someArray.length"] );
				} );

				it( "is tracking alternative removal of items from such an array via monitor", function() {
					const monitored = Monitor( data, { recursive: true } );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();

					monitored.someArray.pop( "foo" );
					monitored.$context.changed.should.not.be.empty();
					monitored.$context.hasChanged.should.be.true();
					[...monitored.$context.changed.keys()].should.be.deepEqual( ["someArray.length"] );
				} );

				it( "is tracking change by updating item of such an array via monitor", function() {
					const monitored = Monitor( data, { recursive: true } );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();

					monitored.someArray[0] = "bar";
					monitored.$context.changed.should.not.be.empty();
					monitored.$context.hasChanged.should.be.true();
					[...monitored.$context.changed.keys()].should.be.deepEqual( ["someArray.0"] );
				} );

				it( "is NOT tracking change by updating item of such an array via monitor using same value", function() {
					const monitored = Monitor( data, { recursive: true } );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();

					monitored.someArray[0] = "foo";
					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
				} );

				it( "is NOT tracking change by updating item of such an array via monitor when using different value coerced to same value", function() {
					const monitored = Monitor( data, { recursive: true, coercion: { "someArray.0": v => v.toLowerCase() } } );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();

					monitored.someArray[0] = "FOO";
					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
				} );

				it( "is NOT tracking change by updating item of such an array via monitor using value considered identical by custom comparison callback", function() {
					const monitored = Monitor( data, { recursive: true, customCompare: () => true } );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();

					monitored.someArray[0] = "different-from-foo";
					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
				} );

				it( "is NOT tracking change by updating item of such an array via monitor using same value ignoring custom comparison callback claiming them to be different", function() {
					const monitored = Monitor( data, { recursive: true, customCompare: () => false } );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();

					monitored.someArray[0] = "foo";
					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
				} );
			} );

			describe( "observes arrays in deep properties and thus", () => {
				it( "is NOT tracking addition or removal of items to/from such an array via original object", function() {
					const monitored = Monitor( data, { recursive: true } );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();

					data.someObject.deepList.push( "foo" );
					data.someObject.deepList.pop( "foo" );
					data.someObject.deepList.unshift( "foo" );
					data.someObject.deepList.shift( "foo" );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
				} );

				it( "is tracking addition of items to such an array via monitor", function() {
					const monitored = Monitor( data, { recursive: true } );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();

					monitored.someObject.deepList.push( "foo" );
					monitored.$context.changed.should.not.be.empty();
					monitored.$context.hasChanged.should.be.true();
					[...monitored.$context.changed.keys()].should.be.deepEqual( ["someObject.deepList.1"] );

					monitored.someObject.deepList.unshift( "foo" );
					monitored.$context.changed.should.not.be.empty();
					monitored.$context.hasChanged.should.be.true();
					[...monitored.$context.changed.keys()].should.be.deepEqual( [ "someObject.deepList.1", "someObject.deepList.2" ] );
				} );

				it( "is tracking removal of items from such an array via monitor", function() {
					const monitored = Monitor( data, { recursive: true } );

					data.someObject.deepList.push( "foo" );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();

					monitored.someObject.deepList.pop( "foo" );
					monitored.$context.changed.should.not.be.empty();
					monitored.$context.hasChanged.should.be.true();
					[...monitored.$context.changed.keys()].should.be.deepEqual( ["someObject.deepList.length"] );

					monitored.someObject.deepList.shift( "foo" );
					monitored.$context.changed.should.not.be.empty();
					monitored.$context.hasChanged.should.be.true();
					[...monitored.$context.changed.keys()].should.be.deepEqual( ["someObject.deepList.length"] );
				} );

				it( "is tracking alternative removal of items from such an array via monitor", function() {
					const monitored = Monitor( data, { recursive: true } );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();

					monitored.someObject.deepList.pop( "foo" );
					monitored.$context.changed.should.not.be.empty();
					monitored.$context.hasChanged.should.be.true();
					[...monitored.$context.changed.keys()].should.be.deepEqual( ["someObject.deepList.length"] );
				} );

				it( "is tracking change by updating item of such an array via monitor", function() {
					const monitored = Monitor( data, { recursive: true } );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();

					monitored.someObject.deepList[0] = "bar";
					monitored.$context.changed.should.not.be.empty();
					monitored.$context.hasChanged.should.be.true();
					[...monitored.$context.changed.keys()].should.be.deepEqual( ["someObject.deepList.0"] );
				} );

				it( "is NOT tracking change by updating item of such an array via monitor using same value", function() {
					const monitored = Monitor( data, { recursive: true } );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();

					monitored.someObject.deepList[0] = "foo";
					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
				} );

				it( "is NOT tracking change by updating item of such an array via monitor when using different value coerced to same value", function() {
					const monitored = Monitor( data, { recursive: true, coercion: { "someObject.deepList.0": v => v.toLowerCase() } } );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();

					monitored.someObject.deepList[0] = "FOO";
					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
				} );

				it( "is NOT tracking change by updating item of such an array via monitor using value considered identical by custom comparison callback", function() {
					const monitored = Monitor( data, { recursive: true, customCompare: () => true } );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();

					monitored.someObject.deepList[0] = "different-from-foo";
					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
				} );

				it( "is NOT tracking change by updating item of such an array via monitor using same value ignoring custom comparison callback claiming them to be different", function() {
					const monitored = Monitor( data, { recursive: true, customCompare: () => false } );

					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();

					monitored.someObject.deepList[0] = "foo";
					monitored.$context.changed.should.be.empty();
					monitored.$context.hasChanged.should.be.false();
				} );
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
					const monitored = Monitor( data, {
						coercion: {
							someInteger: value => String( value ),
						}
					} );

					monitored.someInteger = 2000;

					monitored.someInteger.should.be.a.String().and.equal( "2000" );
				} );

				it( "is NOT obeyed on re-assigning existing value of selected property", () => {
					const monitored = Monitor( data, {
						coercion: {
							someInteger: value => String( value ),
						}
					} );

					monitored.someInteger = 1000;

					monitored.someInteger.should.be.a.Number().and.equal( 1000 );
				} );

				it( "is NOT obeyed on missing function exactly associated with path name of adjusted property", () => {
					const monitored = Monitor( data, {
						coercion: {
							someInteger: value => String( value ),
						}
					} );

					monitored.someDifferentInteger = 3000;

					monitored.someDifferentInteger.should.be.a.Number().and.equal( 3000 );
				} );

				it( "must provide handler with full path name of adjusted property", () => {
					const monitored = Monitor( data, {
						coercion: {
							theObject: value => "simple: " + value,
							"someObject.theObject": value => "full path: " + value,
						}, recursive: true
					} );

					monitored.theObject = "added";
					monitored.someObject.theObject = "updated";

					monitored.theObject.should.be.a.String().and.equal( "simple: added" );
					monitored.someObject.theObject.should.be.a.String().and.equal( "full path: updated" );
				} );

				it( "is NOT obeyed on adjusting deep property w/ non-recursive monitor", () => {
					const monitored = Monitor( data, {
						coercion: {
							theObject: value => "simple: " + value,
							"someObject.theObject": value => "full path: " + value,
						}, recursive: false
					} );

					monitored.theObject = "added";
					monitored.someObject.theObject = "updated";

					monitored.theObject.should.be.a.String().and.equal( "simple: added" );
					monitored.someObject.theObject.should.be.a.String().and.equal( "updated" );
				} );

				it( "may use fallback handler matching last segment of adjusted property's path name, only", () => {
					const monitored = Monitor( data, {
						coercion: {
							theObject: ( value, label ) => "simple @" + label + ": " + value,
							"someObject.theObject": ( value, label ) => "full path @" + label + ": " + value,
							"*.theObject": ( value, label ) => "any level @" + label + ": " + value,
						}, recursive: true
					} );

					monitored.theObject = "added";
					monitored.someObject.theObject = "updated";
					monitored.anotherObject = {};
					monitored.anotherObject.theObject = "added";
					monitored.anotherObject.subObject = {};
					monitored.anotherObject.subObject.theObject = "added";

					monitored.theObject.should.be.a.String().and.equal( "simple @theObject: added" );
					monitored.someObject.theObject.should.be.a.String().and.equal( "full path @someObject.theObject: updated" );
					monitored.anotherObject.theObject.should.be.a.String().and.equal( "any level @anotherObject.theObject: added" );
					monitored.anotherObject.subObject.theObject.should.be.a.String().and.equal( "any level @anotherObject.subObject.theObject: added" );
				} );

				it( "is NOT implicitly obeyed on assigning complex values containing properties to be coerced", () => {
					const monitored = Monitor( data, {
						coercion: {
							theObject: value => "simple: " + value,
							"someObject.theObject": value => "full path: " + value,
							"*.theObject": value => "any level: " + value,
						}, recursive: true
					} );

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
					const monitored = Monitor( data, {
						coercion: {
							someInteger: value => String( value ),
							"*": ( value, label ) => "fallback @" + label + ": " + value,
						}
					} );

					monitored.someInteger.should.be.a.Number().and.equal( 1000 );

					monitored.someInteger = 2000;

					monitored.someInteger.should.be.a.String().and.equal( "2000" );

					monitored.someDifferentInteger = 3000;

					monitored.someDifferentInteger.should.be.a.String().and.equal( "fallback @someDifferentInteger: 3000" );
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

	describe( "detects changing previously adjusted property and thus", () => {
		let hasLoggedSomething;
		let oldHandler;

		beforeEach( () => {
			oldHandler = console.error; // eslint-disable-line no-console
			console.error = () => { // eslint-disable-line no-console
				hasLoggedSomething = true;
			};
			hasLoggedSomething = false;
		} );

		afterEach( () => {
			console.error = oldHandler; // eslint-disable-line no-console
		} );


		it( "fails on replacing some previously monitored change w/o committing first", function() {
			const monitor = Monitor( { prop: "original" } );

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
			const monitor = Monitor( { prop: "original" }, { fail: false } );

			( () => { monitor.prop = "changed"; } ).should.not.throw();
			( () => { monitor.prop = "re-changed"; } ).should.not.throw();

			monitor.prop.should.equal( "re-changed" );

			( () => { monitor.prop = "changed again"; } ).should.not.throw();

			monitor.prop.should.equal( "changed again" );

			monitor.$context.commit();

			( () => { monitor.prop = "changed once more"; } ).should.not.throw();

			monitor.prop.should.equal( "changed once more" );
		} );

		it( "does not fail on replacing some previously monitored change w/o committing first while _relaxing_", function() {
			const monitor = Monitor( { prop: { sub: "original" } }, { recursive: true } );

			( () => { monitor.prop.sub = "changed"; } ).should.not.throw();
			( () => { monitor.prop.sub = "re-changed"; } ).should.throw();

			monitor.prop.sub.should.equal( "changed" );

			monitor.$context.relax();
			monitor.$context.relaxed.should.be.true();

			( () => { monitor.prop.sub = "re-changed"; } ).should.not.throw();

			monitor.prop.sub.should.equal( "re-changed" );

			monitor.$context.relax( false );
			monitor.$context.relaxed.should.be.false();

			( () => { monitor.prop.sub = "re-re-changed"; } ).should.throw();

			monitor.prop.sub.should.equal( "re-changed" );

			monitor.$context.commit();

			( () => { monitor.prop.sub = "re-re-changed"; } ).should.not.throw();

			monitor.prop.sub.should.equal( "re-re-changed" );
		} );

		it( "is logging error on console and is throwing exception by default", () => {
			const data = {};
			const monitored = Monitor( data );

			hasLoggedSomething.should.be.false();

			monitored.property = "initialValue";

			hasLoggedSomething.should.be.false();

			( () => {
				monitored.property = "newValue";
			} ).should.throw();

			hasLoggedSomething.should.be.true();
		} );

		it( "is neither logging error on console nor is throwing exception when committing previous changes", () => {
			const data = {};
			const monitored = Monitor( data );

			hasLoggedSomething.should.be.false();

			monitored.property = "initialValue";

			hasLoggedSomething.should.be.false();

			monitored.$context.commit();

			( () => {
				monitored.property = "newValue";
			} ).should.not.throw();

			hasLoggedSomething.should.be.false();
		} );

		it( "is logging error on console w/ exception disabled in monitor's configuration", () => {
			const data = { sub: {} };
			const monitored = Monitor( data, { fail: false, recursive: true } );

			hasLoggedSomething.should.be.false();

			monitored.sub.property = "initialValue";

			hasLoggedSomething.should.be.false();

			monitored.sub.property = "newValue";

			hasLoggedSomething.should.be.true();
		} );

		it( "is not logging error on console w/ exception disabled in monitor's configuration while _relaxing_", () => {
			const data = { sub: {} };
			const monitored = Monitor( data, { fail: false, recursive: true } );

			hasLoggedSomething.should.be.false();

			monitored.sub.property = "initialValue";

			hasLoggedSomething.should.be.false();

			monitored.$context.relax();

			monitored.sub.property = "newValue";

			hasLoggedSomething.should.be.false();
		} );

		it( "is throwing exception w/ warnings disabled in monitor's configuration", () => {
			const data = {};
			const monitored = Monitor( data, { warn: false } );

			hasLoggedSomething.should.be.false();

			monitored.property = "initialValue";

			hasLoggedSomething.should.be.false();

			( () => {
				monitored.property = "newValue";
			} ).should.throw();

			hasLoggedSomething.should.be.false();
		} );

		it( "is neither logging error on console nor is throwing exception w/ warnings and exceptions disabled in monitor's configuration", () => {
			const data = {};
			const monitored = Monitor( data, { warn: false, fail: false } );

			hasLoggedSomething.should.be.false();

			monitored.property = "initialValue";

			hasLoggedSomething.should.be.false();

			monitored.property = "newValue";

			hasLoggedSomething.should.be.false();
		} );
	} );

	describe( "provides clone() method for cloning monitor instance which", () => {
		it( "creates another monitored object", function() {
			const data = { sub: { prop: "original" } };
			const source = Monitor( data, { recursive: true } );
			const clone = source.$context.clone();

			( clone === source ).should.be.false();
			clone.$context.should.be.ok();
			clone.$context.commit.should.be.Function();
			clone.$context.rollBack.should.be.Function();
			clone.$context.clone.should.be.Function();
			clone.$context.changed.should.be.instanceOf( Map );
		} );

		it( "creates deep clone of monitored object as well", function() {
			const data = { sub: { prop: "original" } };
			const source = Monitor( data, { recursive: true } );
			const clone = source.$context.clone();

			clone.sub.prop = "adjusted";

			clone.sub.prop.should.be.equal( "adjusted" );
			source.sub.prop.should.be.equal( "original" );
		} );

		it( "creates deep clone of monitored object including preceding changes", function() {
			const data = { sub: { prop: "original" } };
			const source = Monitor( data, { recursive: true } );

			source.sub.prop = "adjusted";

			const clone = source.$context.clone();

			clone.sub.prop.should.be.equal( "adjusted" );
			source.sub.prop.should.be.equal( "adjusted" );
		} );

		it( "includes cloning list of changed properties", function() {
			const data = { sub: { prop: "original" } };
			const source = Monitor( data, { recursive: true } );

			source.sub.prop = "adjusted";

			const clone = source.$context.clone();

			clone.$context.hasChanged.should.be.true();
			clone.$context.changed.get( "sub.prop" ).should.be.equal( "original" );
		} );

		it( "creates clone that can be rolled back independently of its source", function() {
			const data = { sub: { prop: "original" } };
			const source = Monitor( data, { recursive: true } );

			source.sub.prop = "adjusted";

			const clone = source.$context.clone();

			source.$context.hasChanged.should.be.true();
			source.$context.changed.get( "sub.prop" ).should.be.equal( "original" );
			source.sub.prop.should.be.equal( "adjusted" );

			clone.$context.hasChanged.should.be.true();
			clone.$context.changed.get( "sub.prop" ).should.be.equal( "original" );
			clone.sub.prop.should.be.equal( "adjusted" );

			clone.$context.rollBack();

			source.$context.hasChanged.should.be.true();
			source.$context.changed.get( "sub.prop" ).should.be.equal( "original" );
			source.sub.prop.should.be.equal( "adjusted" );

			clone.$context.hasChanged.should.be.false();
			clone.sub.prop.should.be.equal( "original" );
		} );

		it( "creates clone that can be committed independently of its source", function() {
			const data = { sub: { prop: "original" } };
			const source = Monitor( data, { recursive: true } );

			source.sub.prop = "adjusted";

			const clone = source.$context.clone();

			source.$context.hasChanged.should.be.true();
			source.$context.changed.get( "sub.prop" ).should.be.equal( "original" );
			source.sub.prop.should.be.equal( "adjusted" );

			clone.$context.hasChanged.should.be.true();
			clone.$context.changed.get( "sub.prop" ).should.be.equal( "original" );
			clone.sub.prop.should.be.equal( "adjusted" );

			clone.$context.commit();

			source.$context.hasChanged.should.be.true();
			source.$context.changed.get( "sub.prop" ).should.be.equal( "original" );
			source.sub.prop.should.be.equal( "adjusted" );

			clone.$context.hasChanged.should.be.false();
			clone.sub.prop.should.be.equal( "adjusted" );
		} );
	} );

	describe( "statically exposes its clone function which", () => {
		it( "clones objects recursively by default", () => {
			const a = { name: "foo", extra: { age: 5 } };
			const b = Monitor.createClone( a );

			( a === b ).should.be.false();
			( a.extra === b.extra ).should.be.false();
		} );

		it( "clones objects non-recursively on demand", () => {
			const a = { name: "foo", extra: { age: 5 } };
			const b = Monitor.createClone( a, false );

			( a === b ).should.be.false();
			( a.extra === b.extra ).should.be.true();
		} );

		it( "clones arrays recursively by default", () => {
			const a = [ "foo", { age: 5 } ];
			const b = Monitor.createClone( a );

			( a === b ).should.be.false();
			( a[1] === b[1] ).should.be.false();
		} );

		it( "clones arrays non-recursively on demand", () => {
			const a = [ "foo", { age: 5 } ];
			const b = Monitor.createClone( a, false );

			( a === b ).should.be.false();
			( a[1] === b[1] ).should.be.true();
		} );

		it( "clones instance of Date", () => {
			const a = new Date();
			const b = Monitor.createClone( a );

			( a === b ).should.be.false();
			( a.getTime() === b.getTime() ).should.be.true();

			const c = { when: new Date() };
			const d = Monitor.createClone( c );

			( c.when === d.when ).should.be.false();
			( c.when.getTime() === d.when.getTime() ).should.be.true();
		} );

		it( "clones instances of Map recursively by default", () => {
			const a = new Map( [ [ "name", "foo" ], [ "extra", new Map( [[ "age", 5 ]] ) ] ] );
			const b = Monitor.createClone( a );

			( a === b ).should.be.false();
			( a.get( "extra" ) === b.get( "extra" ) ).should.be.false();
			( a.get( "extra" ).get( "age" ) === b.get( "extra" ).get( "age" ) ).should.be.true();
		} );

		it( "clones instances of Map non-recursively on demand", () => {
			const a = new Map( [ [ "name", "foo" ], [ "extra", new Map( [[ "age", 5 ]] ) ] ] );
			const b = Monitor.createClone( a, false );

			( a === b ).should.be.false();
			( a.get( "extra" ) === b.get( "extra" ) ).should.be.true();
			( a.get( "extra" ).get( "age" ) === b.get( "extra" ).get( "age" ) ).should.be.true();
		} );

		it( "clones instances of Set recursively by default", () => {
			const a = new Set( [new Set( [ "foo", 5 ] )] );
			const b = Monitor.createClone( a );

			( a === b ).should.be.false();
			( [...a][0] === [...b][0] ).should.be.false();
			( [...[...a][0]][1] === [...[...b][0]][1] ).should.be.true();
		} );

		it( "clones instances of Set non-recursively on demand", () => {
			const a = new Set( [new Set( [ "foo", 5 ] )] );
			const b = Monitor.createClone( a, false );

			( a === b ).should.be.false();
			( [...a][0] === [...b][0] ).should.be.true();
			( [...[...a][0]][1] === [...[...b][0]][1] ).should.be.true();
		} );

		it( "invokes any custom clone() method per object", () => {
			const a = { clone: () => 5 };
			const b = Monitor.createClone( a );

			( a === b ).should.be.false();
			b.should.be.equal( 5 );

			const c = { outer: { clone: () => 5 } };
			const d = Monitor.createClone( c );

			( c === d ).should.be.false();
			( c.outer === d.outer ).should.be.false();
			d.outer.should.be.equal( 5 );

			const e = Monitor.createClone( c, false );

			( c === e ).should.be.false();
			( c.outer === e.outer ).should.be.true();
		} );

		it( "ignores injected prototype reference", () => {
			const a = { __proto__: { bad: true } };
			const b = Monitor.createClone( a );

			( a.bad == null ).should.be.false();
			( b.bad == null ).should.be.true();
		} );

		it( "ignores injected constructor reference", () => {
			const a = { constructor: { bad: true } };
			const b = Monitor.createClone( a );

			( a.constructor === b.constructor ).should.be.false();
			( b.bad == null ).should.be.true();

			const c = { __proto__: { constructor: { bad: true } } };
			const d = Monitor.createClone( c );

			( c.constructor === d.constructor ).should.be.false();
			( d.bad == null ).should.be.true();

			const e = { constructor: { prototype: { bad: true } } };
			const f = Monitor.createClone( e );

			( f.bad == null ).should.be.true();
		} );
	} );
} );
