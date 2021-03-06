﻿/**	# Element

Element is the term used in Inveniemus for representations of 
[candidate solutions](http://en.wikipedia.org/wiki/Feasible_region) in a search or optimization 
[problem](Problem.js.html). Implementations may declare their own subclass of `Element` to represent
their candidate solutions.
*/
var Element = exports.Element = declare({
	/** All elements are defined by an array of numbers (i.e. the element's `values`, random numbers
	by default) and an `evaluation` (`NaN` by default). The element's values are coerced to be in 
	the [0,1] range.
	
	The `values` store all data about the candidate solution this element represents. This may 
	appear to abstract and stark, but it helps	to separate the problem definition from the search
	or optimization strategy.
	
	The element's `evaluation` is a numerical assessment of the represented candidate solution. 
	Usually is a measure of how well the problem is solved, or how close the element is to a real 
	solution. It guides almost all of the metaheuristics.
	*/
	constructor: function Element(values, evaluation) {
		if (typeof values === 'undefined') {
			this.values = this.random.randoms(this.length);
		} else {
			this.values = values.map(function (value, i) {
				raiseIf(isNaN(value), "Value #", i, " for element is NaN!");
				return Math.min(1, Math.max(0, +value));
			});
		}
		this.evaluation = +evaluation;
	},
	
	/** The class property `length` defines the size of the element's values array (10 by default).
	*/
	length: 10,

	/** The pseudorandom number generator in the class property `random` is required by some of the
	element's operations. Its equal to `base.Randomness.DEFAULT` by default.
	*/
	random: Randomness.DEFAULT,
	
	// ## Basic operations #########################################################################
	
	/** The element's evaluation is calculated by `evaluate()`, which assigns and returns this 
	number. It can return a promise if the evaluation has to be done asynchronously. This can be 
	interpreted as the solutions cost in a search problem or the target function of an optimization 
	problem. The default behaviour is adding up this element's values, useful only for testing.
	*/
	evaluate: function evaluate() {
		return this.evaluation = iterable(this.values).sum();
	},

	/** Whether this element is a actual solution or not is decided by `suffices()`. It holds the 
	implementation of the goal test in search problems. More complex criteria may be implemented in 
	`Problem.suffices`. By default it returns false.
	*/
	suffices: function suffices() {
		return false;
	},
	
	/** Usually a numbers array is just too abstract to handle, and	another representation of the 
	candidate solution must be build. For this `mapping()` must be overridden to returns an 
	alternate representation of this element that may be fitter for evaluation or showing it to the
	user. By default it just returns the same `values` array.
	*/
	mapping: function mapping() {
		return this.values;
	},

	/** The `emblem` of an element is a string that represents it and can be displayed to the user. 
	By default returns the JSON conversion of the `values` array.
	*/
	emblem: function emblem() {
		return JSON.stringify(this.mapping());
	},

	// ## Evaluations ##############################################################################

	/** The element's `resolution` is the minimal difference between elements' evaluations, below 
	which two evaluations are considered equal.
	*/
	resolution: 1e-15,
	
	/** The [Hamming distance](http://en.wikipedia.org/wiki/Hamming_distance) between two arrays is 
	the number of positions at which corresponding components are different. Arrays are assumed to 
	be of the same length. If they are not, only the common parts are considered.
	*/
	hammingDistance: function hammingDistance(array1, array2) {
		return iterable(array1).zip(array2).filter(function (pair) {
			return pair[0] != pair[1];
		}).count();
	},

	/** The [Manhattan distance](http://en.wikipedia.org/wiki/Manhattan_distance) between two arrays 
	is the sum of the absolute differences of corresponding positions.
	*/
	manhattanDistance: function manhattanDistance(array1, array2) {
		return iterable(array1).zip(array2).map(function (pair) {
			return Math.abs(pair[0] - pair[1]);
		}).sum();
	},

	/** The [euclidean distance](http://en.wikipedia.org/wiki/Euclidean_distance) between two arrays 
	is another option for evaluation.
	*/
	euclideanDistance: function euclideanDistance(array1, array2) {
		return Math.sqrt(iterable(array1).zip(array2).map(function (pair) {
			return Math.pow(pair[0] - pair[1], 2);
		}).sum());
	},

	/** Another common evaluation is the [root mean squared error](http://en.wikipedia.org/wiki/Root_mean_squared_error).
	The method `rootMeanSquaredError` takes a function `f` (usually a mapping of this element) and 
	some `data`. This `data` must be an iterable of arrays, in which the first element is the 
	expected result and the rest are the arguments for the function.
	*/
	rootMeanSquaredError: function rootMeanSquaredError(f, data) {
		var length = 0,
			error = iterable(data).map(function (datum) {
				length++;
				return Math.pow(datum[0] - f.apply(this, datum.slice(1)), 2);
			}).sum();
		return length === 0 ? 0 : Math.sqrt(error / length);
	},

	// ## Expansions ###############################################################################
	
	/** An element's `successors` are other elements that can be considered adjacent of this 
	element. By default returns the element's neighbourhood with the default radius.
	*/
	successors: function successors(element) {
		return this.neighbourhood();
	},
	
	/** An element's `neighbourhood` is a set of new elements, with values belonging to the n 
	dimensional ball around this element's values with the given `radius` (1% by default). 
	*/
	neighbourhood: function neighbourhood(radius) {
		var elems = [], 
			values = this.values,
			i, d, value;
		for (i = 0; i < values.length; i++) {
			d = typeof(radius) === 'number' ? radius : Array.isArray(radius) ? radius[i] : 1 / 100;
			value = values[i] + d;
			if (value <= 1) {
				elems.push(this.modification(i, value));
			}
			value = values[i] - d;
			if (value >= 0) {
				elems.push(this.modification(i, value));
			}
		}
		return elems;
	},
	
	/** The method `modification(index, value, ...)` returns a new and unevaluated copy of this 
	element, with its values modified as specified. Values are always coerced to the [0,1] range.
	*/
	modification: function modification() {
		var newValues = this.values.slice(), i, v;
		for (i = 0; i < arguments.length; i += 2) {
			v = +arguments[i + 1];
			raiseIf(isNaN(v), "Invalid value ", v, " for element.");
			newValues[arguments[i] |0] = Math.min(1, Math.max(0, v));
		}
		return new this.constructor(newValues);
	},
	
	// ## Mappings #################################################################################
	
	/** An array mapping builds an array of equal length of this element's `values`. Each value is 
	used to index the corresponding items argument. If there are less arguments than the element's 
	`length`, the last one is used for the rest of the values.
	
	Warning! This method assumes this element's values are in the range [0,1].
	*/
	arrayMapping: function arrayMapping() {
		var args = arguments, 
			lastItems = args[args.length - 1];
		raiseIf(args.length < 1, "Element.arrayMapping() expects at least one argument.");
		return this.values.map(function (v, i) {
			var items = args.length > i ? args[i] : lastItems;
			return items[v * items.length | 0];
		});
	},
	
	/** A set mapping builds an array of equal length of this element's `values`. Each value is used 
	to select one item. Items are not selected more than once. 
	
	Warning! This method assumes this element's values are in the range [0,1].
	*/
	setMapping: function setMapping(items) {
		raiseIf(!Array.isArray(items), "Element.setMapping() expects an array argument.");
		items = items.slice(); // Shallow copy.
		return this.values.map(function (v, i) {
			return items.splice(v * items.length | 0, 1)[0];
		});
	},
	
	/** A range mapping builds an array of equal length of this element's `values`. Each value is 
	translated from [0,1] to the corresponding range.
	*/
	rangeMapping: function rangeMapping() {
		var args = arguments, 
			lastRange = args[args.length - 1];
		raiseIf(args.length < 1, "Element.rangeMapping() expects at least one argument.");
		return this.values.map(function (v, i) {
			var range = args.length > i ? args[i] : lastRange;
			return v * (range[1] - range[0]) + range[0];
		});
	},
	
	// ## Other utilities ##########################################################################

	/** A `clone` is a copy of this element.
	*/
	clone: function clone() {
		return new this.constructor(this.values, this.evaluation);
	},
	
	/** Two elements can be compared with `equals(other)`. It checks if the other element has the 
	same values and constructor than this one.
	*/
	equals: function equals(other) {
		if (this.constructor === other.constructor && this.values.length === other.values.length) {
			for (var i = 0, len = this.values.length; i < len; i++) {
				if (this.values[i] !== other.values[i]) {
					return false;
				}
			}
			return true;
		}
		return false;
	},
	
	/** The default string representation of an Element instance has this shape: 
	`"Element(values, evaluation)"`.
	*/
	toString: function toString() {
		return (this.constructor.name || 'Element') +"("+ JSON.stringify(this.values) +", "+ this.evaluation +")";
	}
}); // declare Element.
