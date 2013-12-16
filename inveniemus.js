"use strict"; (function (init) {
	if (typeof define === 'function' && define.amd) {
		define(['basis'], init); // AMD module.
	} else if (typeof module === 'object' && module.exports) {
		module.exports = init(require('basis')); // CommonJS module.
	} else {
		var global = (0, eval)('this');
		global.inveniemus = init(global.basis); // Global namespace.
	}
})(function (basis){ var exports = {};
/** inveniemus/src/Element.js
	Element is the term used in the Inveniemus library for representations of
	candidate solutions in a search or optimization problem.
	See <http://en.wikipedia.org/wiki/Metaheuristic>.
	
	@author <a href="mailto:leonardo.val@creatartis.com">Leonardo Val</a>
	@licence MIT Licence
*/
var __DEFAULT_RANDOM__ = basis.Randomness.DEFAULT,
	iterable = basis.iterable;

// Element base constructor. ///////////////////////////////////////////////////

var Element = exports.Element = basis.declare({
	/** Element.length=10:
		Size of the element's values array.
	*/
	length: 10,

	/** Element.minimumValue=0:
		Minimum value a number in this element can have.
	*/
	minimumValue: 0,
	
	/** Element.maximumValue=1:
		Maximum value a number in this element can have.
	*/
	maximumValue: 1,
	
	/** Element.random=Randomness.DEFAULT:
		Pseudorandom number generator used by the element.
	*/
	random: __DEFAULT_RANDOM__,
	
	/** new Element(values=<random values>, evaluation=NaN):
		An element represents a candidate solution. It is defined by the values
		array of numbers, between minimumValue and maximumValue (by default 0 
		and 1).
	*/
	constructor: function Element(values, evaluation) {
		if (typeof values === 'undefined') {
			values = this.randomValues();
		}
		/** Element.values:
			An array of numbers that represents a candidate solution.
		*/
		this.values = values.slice(); // Makes a shallow copy.
		/** Element.evaluation=NaN:
			The element's evaluation is a measure of its fitness to solve a
			problem. It guides almost all of the metaheuristics.
		*/
		this.evaluation = +evaluation;
	},

	/** Element.randomValue():
		Returns a random value between this.minimumValue and this.maximumValue.
	*/
	randomValue: function randomValue() {
		return this.random.random(this.minimumValue, this.maximumValue);
	},
	
	/** Element.randomValues():
		Returns an array with random numbers.
	*/
	randomValues: function randomValues() {
		var values = new Array(this.length),
			offset = this.minimumValue,
			factor = this.maximumValue - this.minimumValue;
		for (var i = 0; i < this.length; i++) {
			values[i] = this.random.random() * factor + offset;
		}
		return values;
	},
	
	/** Element.evaluate():
		Evaluates this element, assigning its evaluation and returning it. It 
		can return a Future if the evaluation has to be done asynchronously. 
		This can be interpreted as the solutions cost in a search problem or the
		target function of an optimization problem. The default behaviour is 
		adding up this element's values, useful only for testing.
	*/
	evaluate: function evaluate() {
		return this.evaluation = iterable(this.values).sum();
	},

	/** Element.suffices():
		Returns true if this element is an actual solution to the problem. It 
		holds the implementation of the goal test in search problems. More 
		complex criteria may be implemented in Problem.suffices.
		By default it checks if the values add up to zero.
	*/
	suffices: function suffices() {
		return iterable(this.values).sum() === 0;
	},
	
	/** Element.mapping():
		Returns an alternate representation of this element that may be fitter
		for evaluation or showing it to the user. By default it just returns the 
		values array.
	*/
	mapping: function mapping() {
		return this.values;
	},

	/** Element.emblem():
		The emblem of an element is a string that represents it and can	be 
		displayed to the user. By default returns the string conversion.
	*/
	emblem: function emblem() {
		return JSON.stringify(this.mapping());
	},

	// Evaluation utilities. ///////////////////////////////////////////////////

	/** Element.resolution=Number.EPSILON:
		Minimum difference between two evaluation to consider them different.
	*/
	resolution: Number.EPSILON || 2.220446049250313e-16,
	
	/** Element.hammingDistance(array1, array2):
		The Hamming distance between two arrays is the number of positions at 
		which corresponding components are different. Arrays are assumed to be
		of the same length. If they are not, only the common parts are 
		considered.
		See <http://en.wikipedia.org/wiki/Hamming_distance>.
	*/
	hammingDistance: function hammingDistance(array1, array2) {
		return iterable(array1).zip(array2).filter(function (pair) {
			return pair[0] != pair[1];
		}).count();
	},

	/** Element.manhattanDistance(array1, array2):
		The Manhattan distance between two arrays is the sum of the absolute 
		differences of corresponding positions. Arrays are assumed to be of the 
		same length. If they are not, only the common parts are considered.
		See <http://en.wikipedia.org/wiki/Manhattan_distance>.
	*/
	manhattanDistance: function manhattanDistance(array1, array2) {
		return iterable(array1).zip(array2).map(function (pair) {
			return Math.abs(pair[0] - pair[1]);
		}).sum();
	},

	/** Element.euclideanDistance(array1, array2):
		Calculates the euclidean distance between two arrays. Arrays are assumed
		to be of the same length. If they are not, only the common parts are 
		considered.
		See <http://en.wikipedia.org/wiki/Euclidean_distance>.
	*/
	euclideanDistance: function euclideanDistance(array1, array2) {
		return Math.sqrt(iterable(array1).zip(array2).map(function (pair) {
			return Math.pow(pair[0] - pair[1], 2);
		}).sum());
	},

	/** Element.rootMeanSquaredError(f, data):
		Returns the root mean squared error of the function f on the given 
		data. The data must be an iterable of arrays, in which the first element 
		is the expected result and the rest are the arguments for the function.
		See <http://en.wikipedia.org/wiki/Root_mean_squared_error>.
	*/
	rootMeanSquaredError: function rootMeanSquaredError(f, data) {
		var length = 0,
			error = iterable(data).map(function (datum) {
				length++;
				return Math.pow(datum[0] - f.apply(this, datum.slice(1)), 2);
			}).sum()
		return length == 0 ? 0 : Math.sqrt(error / length);
	},

	// Expansion utilities. ////////////////////////////////////////////////////
	
	/** Element.neighbourhood(delta=0.01):
		Returns an array of new elements, with values belonging to the n 
		dimensional ball around this element's values. 
	*/
	neighbourhood: function neighbourhood(delta) {
		delta = isNaN(delta) ? 0.01 : +delta;
		var elems = [], 
			values = this.values,
			i, value;
		for (i = 0; i < values.length; i++) {
			value = values[i] + delta;
			if (value <= this.maximumValue) {
				elems.push(this.modification(i, value));
			}
			value = values[i] - delta;
			if (value >= this.minimumValue) {
				elems.push(this.modification(i, value));
			}
		}
		console.log(delta);//FIXME
		console.log(elems);//FIXME
		return elems;
	},
	
	/** Element.modification(index, value, ...):
		Returns a new and unevaluated copy of this element, with its values
		modified as specified.
	*/
	modification: function modification() {
		var copy = new this.constructor(this.values), i, v;
		for (i = 0; i < arguments.length; i += 2) {
			v = +arguments[i + 1];
			basis.raiseIf(isNaN(v) || v < this.minimumValue || v > this.maximumValue, "Invalid value ", v, " for element.");
			copy.values[arguments[i] | 0] = +arguments[i + 1];
		}
		return copy;
	},
	
	// Mapping utilities. //////////////////////////////////////////////////////
	
	/** Element.arrayMapping(items...):
		Builds an array of equal length of this element's values. Each value is
		used to index the corresponding items argument. If there are less 
		arguments than the element's length, the last one is used for the rest
		of the values.
	*/
	arrayMapping: function arrayMapping() {
		var args = arguments, 
			lastItems = args[args.length - 1];
		basis.raiseIf(args.length < 1, "Element.linearMapping() expects at least one argument.");
		return this.values.map(function (v, i) {
			var items = args.length > i ? args[i] : lastItems;
			return items[v * items.length | 0];
		});
	},
	
	/** Element.setMapping(items):
		Builds an array of equal length of this element's values. Each value is
		used to select one item. Items are not selected more than once. 
	*/
	setMapping: function setMapping(items) {
		basis.raiseIf(!Array.isArray(items), "Element.setMapping() expects an array argument.");
		items = items.slice(); // Shallow copy.
		return this.values.map(function (v, i) {
			return items.splice(v * items.length | 0, 1)[0];
		});
	},
	
	// Utility methods. ////////////////////////////////////////////////////////

	/** Element.clone():
		Returns a copy of this element.
	*/
	clone: function clone() {
		return new this.constructor(this.values, this.evaluation);
	},
	
	/** Element.equals(other):
		Checks if the other element has the same values and constructor than 
		this one.
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
	
	toString: function toString() {
		return (this.constructor.name || 'Element') +"("+ JSON.stringify(this.values) +", "+ this.evaluation +")";
	}
}); // declare Element.


/** inveniemus/src/Problem.js
	The Problem type represents a search or optimization problem in the 
	Inveniemus library.
	
	@author <a href="mailto:leonardo.val@creatartis.com">Leonardo Val</a>
	@licence MIT Licence
*/
// Problem base class. /////////////////////////////////////////////////////////

var Problem = exports.Problem = basis.declare({
	/** Problem.title='<no title>':
		Title of the problem to be displayed to the user.
	*/
	title: "<no title>",
		
	/** Problem.description='<no description>':
		Description of the problem to be displayed to the user.
	*/
	description: "<no description>",

	/** Problem.random=Randomness.DEFAULT:
		Pseudorandom number generator used by the problem.
	*/
	random: __DEFAULT_RANDOM__,
	
	/** Problem.representation=Element:
		Element constructor used for this problem's candidate solutions.
	*/
	representation: Element,
	
	/** new Problem(params):
		A search/optimization problem definition, holding the representation of
		the elements (as an Element constructor).
	*/
	constructor: function Problem(params) {
		basis.initialize(this, params)
			.string('title', { coerce: true, ignore: true })
			.string('description', { coerce: true, ignore: true })
			.object('random', { ignore: true })
		// Overrides.
			.func('representation', { ignore: true })
			.func('compare', { ignore: true })
			.func('suffices', { ignore: true });
	},
		
	/** Problem.compare(element1, element2):
		Standard comparison function between two elements. Returns a positive
		number if element1 is better than element2, a negative number if 
		element1 is worse then element2, or zero otherwise.
		Implements a minimization by default.
	*/
	compare: function compare(element1, element2) {
		return this.minimization(element1, element2);
	},
		
	/** Problem.suffices(elements):
		Returns true if inside the elements array there is an actual solution to
		the problem. It holds the implementation of the goal test in search 
		problems. 
		By default checks if the first element by calling its suffice method.
	*/
	suffices: function suffices(elements) {
		return elements[0].suffices();
	},
		
	// Optimization modes. /////////////////////////////////////////////////////
		
	/** Problem.maximization(element1, element2):
		Compares two elements by evaluation in descending order.
	*/
	maximization: function maximization(element1, element2) {
		var d = element2.evaluation - element1.evaluation;
		return isNaN(d) ? -Infinity : Math.abs(d) < element1.resolution ? 0 : d;
	},
	
	/** Problem.minimization(element1, element2):
		Compares two elements by evaluation in ascending order.
	*/
	minimization: function minimization(element1, element2) {
		var d = element1.evaluation - element2.evaluation;
		return isNaN(d) ? Infinity : Math.abs(d) < element1.resolution ? 0 : d;
	},
		
	/** Problem.approximation(target, element1, element2):
		Compares two elements by distance of its evaluation to the given target
		value in ascending order.
	*/
	approximation: function approximation(target, element1, element2) {
		var d = Math.abs(element1.evaluation - target) - Math.abs(element2.evaluation - target);
		return isNaN(d) ? Infinity : Math.abs(d) < element1.resolution ? 0 : d;
	},
		
	// Utility methods. ////////////////////////////////////////////////////////
		
	toString: function toString() {
		return (this.constructor.name || 'Problem') +"("+ JSON.stringify(this) +")";
	}
}); // declare Problem.
		
/** problems:
	Bundle of classic and reference problems.
*/
var problems = exports.problems = {};


/** inveniemus/src/Metaheuristic.js
	A Metaheuristic is usually an optimization algorithm (which can also be used
	for searching).
	See <http://en.wikipedia.org/wiki/Metaheuristic>.
	
	@author <a href="mailto:leonardo.val@creatartis.com">Leonardo Val</a>
	@licence MIT Licence
*/
// Metaheuristic base class ////////////////////////////////////////////////////

var Metaheuristic = exports.Metaheuristic = basis.declare({
	/** Metaheuristic.logger:
		Logger used by the metaheuristic.
	*/
	logger: new basis.Logger('inveniemus', basis.Logger.ROOT, 'INFO'),
	
	/** new Metaheuristic(params):
		Base class of all metaheuristic algorithms, and hence of all 
		metaheuristic runs.
	*/
	constructor: function Metaheuristic(params) {
		basis.initialize(this, params)
		/** Metaheuristic.problem:
			Definition of the problem this metaheuristic will try to solve.
		*/
			.object('problem', { defaultValue: null })
		/** Metaheuristic.size=100:
			Amount of candidate solutions the metaheuristic treats at each step.
		*/
			.number('size', { defaultValue: 100, coerce: true })
		/** Metaheuristic.state=[]:
			An array holding the elements this metaheuristic handles at each
			step.
		*/
			.array('state', { defaultValue: [] })
		/** Metaheuristic.steps=100:
			Number of steps this metaheuristic must perform.
		*/
			.number('steps', { defaultValue: 100, coerce: true })
		/** Metaheuristic.step=-1:
			Current iteration of this metaheuristic, or a negative number if
			it has not started yet.
		*/
			.integer('step', { defaultValue: -1, coerce: true })
		/** Metaheuristic.random=Randomness.DEFAULT:
			This metaheuristic's pseudorandom number generator. It is strongly
			advised to have only one for the whole process.
		*/
			.object('random', { defaultValue: __DEFAULT_RANDOM__ })
		/** Metaheuristic.statistics:
			The statistic gatherer for this metaheuristic.
		*/
			.object('statistics', { defaultValue: new basis.Statistics() })
			.object('logger', { ignore: true });
		/** Metaheuristic.events:
			Event handler for this metaheuristic. Emitted events are: initiated,
			expanded, evaluated, sieved, advanced, analyzed & finished.
		*/
		this.events = new basis.Events({ 
			events: "initiated expanded evaluated sieved advanced analyzed finished".split(' ')
		});
	},
	
	// Basic workflow. /////////////////////////////////////////////////////////
	
	/**	Metaheuristic.initiate(size=this.size):
		Builds and initiates this metaheuristic state with size new cursors. The
		elements are build using the initial() function.
	*/
	initiate: function initiate(size) {
		size = isNaN(size) ? this.size : +size >> 0;
		this.state = new Array(size);
		for (var i = 0; i < size; i++) {
			this.state[i] = new this.problem.representation(); // Element with random values.
		}
		this.events.emit('initiated', this);
		this.logger && this.logger.debug('State has been initiated. Nos coepimus.');
	},
	
	/** Metaheuristic.expand(expansion):
		Adds to this metaheuristic's state the given expansion. If none is given,
		this.expansion() is called to get new expansion.
	*/
	expand: function expand(expansion) {
		expansion = expansion || this.expansion();
		if (expansion.length < 1) {
			this.logger && this.logger.warn("Expansion is empty");
		} else {
			var expanded = this.state.concat(expansion),
				len = expanded.length;
			// Trim equal elements from the expanded state.
			expanded = expanded.filter(function (elem, i) {
				for (i++; i < len; i++) {
					if (elem.equals(expanded[i])) {
						return false;
					}
				}
				return true;
			});
			this.state = expanded;
		}
		this.events.emit('expanded', this);
		this.logger && this.logger.debug('State has been expanded. Nos exploramus.');
	},
	
	/** Metaheuristic.expansion(size):
		Returns an array of new elements to add to the current state. The 
		default implementation generates new random elements.		
	*/
	expansion: function expansion(size) {
		var expansionRate = isNaN(this.expansionRate) ? 0.5 : +this.expansionRate;
		size = isNaN(size) ? Math.floor(expansionRate * this.size) : +size;
		var elems = new Array(size), i;
		for (i = 0; i < size; i++){
			elems[i] = new this.problem.representation();
		}
		return elems;
	},
	
	/** Metaheuristic.evaluate():
		Evaluates all the elements in this.state with no evaluation, using its
		evaluation method. After that sorts the state with the compare method
		of the problem.
		Returns a Future, regardless of the evaluation being asynchoronous or 
		not.
	*/
	evaluate: function evaluate(cursors) {
		var mh = this;
		this.statistics.startTime('time_evaluation');
		return basis.Future.all(iterable(this.state).filter(
			function (element) { // For those elements that don't have an evaluation, ...
				return isNaN(element.evaluation);
			},
			function (element) { // ... evaluate them.
				return basis.when(element.evaluate());
			}
		)).then(function (results) {
			mh.state.sort(mh.problem.compare.bind(mh.problem));
			mh.statistics.addTime('time_evaluation');
			mh.events.emit('evaluated', this);
			mh.logger && mh.logger.debug('Evaluated and sorted ', results.length, ' elements. Appretiatus sunt.');
			return mh;
		});
	},
	
	/** Metaheuristic.prototype.sieve(size=this.size):
		Cuts the current state down to the given size (or this.size by default).
		This is usually used after expanding and evaluating the state. The
		statistics of this metaheuristic are calculated here, right after the
		state is sieved.
	*/
	sieve: function sieve(size) {
		size = isNaN(size) ? this.size : size | 0;
		if (this.state.length > size) {
			this.state = this.state.slice(0, this.size);
		}
		this.events.emit('sieved', this);
		this.logger && this.logger.debug('State has been sieved. Viam selectus est.');
	},
	
	/** Metaheuristic.finished():
		Termination criteria for this metaheuristic. By default it checks if the
		number of passed iterations is not greater than this.steps.
	*/
	finished: function finished() {
		if (this.step >= this.steps || this.problem.suffices(this.state)) {
			this.events.emit('finished', this);
			return true;
		}
		return false;
	},

	/** Metaheuristic.analyze():
		Updates the process' statistics.
	*/
	analyze: function analyze() {
		var stat = this.statistics.stat(['evaluation', 'step='+ this.step]);
		this.state.forEach(function (element) {
			stat.add(element.evaluation, element);
		});
		this.events.emit('analyzed', this);
		return stat;
	},
	
	/** Metaheuristic.advance():
		Performs one step of the optimization. If the process has not been 
		initialized, it does so. Returns a Future if the run has not finished or 
		null otherwise.
	*/
	advance: function advance() {
		var mh = this;
		if (this.step < 0) {
			this.statistics.reset();
			this.statistics.startTime('time_step');
			this.initiate();
		} else {
			this.statistics.startTime('time_step');
			this.expand();
		}
		return this.evaluate().then(function () {
			mh.sieve();
			mh.step = Math.max(0, mh.step + 1);
			mh.analyze(); // Calculate the state stats after sieving it.
			mh.statistics.addTime('time_step');
			mh.events.emit('advanced', this);
			mh.logger && mh.logger.info('Step ', mh.step , ' has been completed. Nos proficimus.');
			return mh;
		});
	},
	
	/** Metaheuristic.run():
		Returns a Future that is resolved when the whole search process is 
		finished. The value is the best cursor after the last step.
	*/
	run: function run() {
		var mh = this, 
			advance = this.advance.bind(this);
		function continues() {
			return !mh.finished();
		}
		return basis.Future.doWhile(advance, continues).then(function () {
			mh.logger && mh.logger.info('Finished. Nos invenerunt!');
			return mh.state[0]; // Return the best cursor.
		});
	},

	/** Metaheuristic.reset():
		Reset the process to start over again. Basically cleans the stats and 
		sets the current step to -1.
	*/
	reset: function reset() {
		this.step = -1;
		this.statistics.reset();
	},
	
	// Utility methods. ////////////////////////////////////////////////////////
	
	toString: function toString() {
		return (this.constructor.name || 'Metaheuristic') +"("+ JSON.stringify(this) +")";
	}	
}); // declare Metaheuristic.

/** metaheuristics:
	Bundle of metaheuristics available.
*/
var metaheuristics = exports.metaheuristics = {};

/** inveniemus/src/metaheuristics/HillClimbing.js
	Hill Climbing implementation for the Inveniemus library.
	See <http://en.wikipedia.org/wiki/Hill_climbing>.
	
	@author <a href="mailto:leonardo.val@creatartis.com">Leonardo Val</a>
	@licence MIT Licence
*/
// HillClimbing metaheuristic. /////////////////////////////////////////////////

var HillClimbing = metaheuristics.HillClimbing = basis.declare(Metaheuristic, {
	/** new HillClimbing(params):
		Builds a hill climbing search.
		See <http://en.wikipedia.org/wiki/Hill_climbing>.
	*/
	constructor: function HillClimbing(params) {
		Metaheuristic.call(this, params);
		basis.initialize(this, params)
		/** HillClimbing.delta=0.01:
			The radius of the elements surroundings in every dimension, that is
			checked by this algorithm.
		*/
			.number('delta', { defaultValue: 0.01, coerce: true })
		/** HillClimbing.size=1:
			Default value for size is 1.
		*/
			.integer('size', { defaultValue: 1,	coerce: true });
	},
	
	/** HillClimbing.expansion():
		New elements are calculated by adding all variation of existing elements
		in the state. Each variation is either an increment or decrement in one
		(and only one) of the element's dimensions.
	*/
	expansion: function expansion() {
		var delta = this.delta,
			elems = [];
		this.__previous__ = this.state[0]; // This is for local optimum detection.
		this.state.forEach(function (element) {
			elems = elems.concat(element.neighbourhood(delta));
		});
		basis.raiseIf(elems.length < 1, "Expansion failed to produce any new elements.");
		return elems;
	},
		
	/** HillClimbing.atLocalOptimum():
		Checks if the search is currently at a local optimum.
	*/
	atLocalOptimum: function atLocalOptimum() {
		return this.__previous__ === this.state[0];
	},
		
	/** HillClimbing.finished():
		Hill climbing search must finish when a local optimum is reached. This
		criteria is tested together with all others.
	*/
	finished: function finished() {
		return Metaheuristic.prototype.finished.call(this) || this.atLocalOptimum();
	},
		
	// Utility methods. ////////////////////////////////////////////////////////
		
	toString: function toString() {
		return (this.constructor.name || 'HillClimbing') +'('+ JSON.stringify(this) +')';
	}
}); // declare HillClimbing.


/** inveniemus/src/metaheuristics/GeneticAlgorithm.js
	Evolutionary computing for the Inveniemus library.
	See <http://en.wikipedia.org/wiki/Evolutionary_algorithm>.
	
	@author <a href="mailto:leonardo.val@creatartis.com">Leonardo Val</a>
	@licence MIT Licence
*/
// GeneticAlgorithm metaheuristic. /////////////////////////////////////////////
var GeneticAlgorithm = metaheuristics.GeneticAlgorithm = basis.declare(Metaheuristic, {
	/** new GeneticAlgorithm(params):
		Builds a genetic algorithm, the base for many evolutionary computing
		variants.
		See <http://en.wikipedia.org/wiki/Genetic_algorithm>.
	*/
	constructor: function GeneticAlgorithm(params) {
		Metaheuristic.call(this, params); // Superconstructor call.
		basis.initialize(this, params)
		/** GeneticAlgorithm.expansionRate=0.5:
			The amount of new elements generated by crossover, as a ratio of the
			population size.
		*/
			.number('expansionRate', { defaultValue: 0.5, minimum: 0, coerce: true })
		/** GeneticAlgorithm.mutationRate=0.2:
			The chance of a new element (resulting from crossover) mutating.
		*/
			.number('mutationRate', { defaultValue: 0.2, minimum: 0, maximum: 1, coerce: true })
		/** GeneticAlgorithm.selection(count):
			Selects count elements from the current population. These will be 
			the parents of the new elements in the next generation.
			By default rank selection is used, a.k.a. fitness proportional
			to position in the state.
		*/
			.func('selection', { defaultValue: GeneticAlgorithm.selections.rankSelection })
		/** GeneticAlgorithm.crossover(parents):
			Genetic operator that simulates reproduction with inheritance. The 
			parents argument must be an array of elements. The result is an 
			array of elements.
			By default the single point crossover is used.
		*/
			.func('crossover', { defaultValue: GeneticAlgorithm.crossovers.singlepointCrossover })
		/** GeneticAlgorithm.mutation(element):
			Genetic operator that simulates biological mutation, making a random
			change in the chromosome.
			By default a single point uniform mutation is used.
		*/
			.func('mutation', { defaultValue: GeneticAlgorithm.mutations.singlepointUniformMutation });
	},

	/** GeneticAlgorithm.expansion():
		Returns the possibly mutated crossovers of selected elements. How many 
		is determined by this.expansionRate.
	*/
	expansion: function expansion() {
		var parents, childs, child,
			newElements = [],
			len = Math.floor(this.expansionRate * this.size);
		len += len % 2; // Make len even.
		for (var i = 0; i < len; i += 2) {
			parents = this.selection();
			childs = this.crossover(parents);
			for (var j = 0; j < childs.length; j++) {
				child = this.random.randomBool(this.mutationRate) ? this.mutation(childs[j]) : childs[j];
				newElements.push(child);
			}
		}
		return newElements;
	},
	
	// Utility methods. ////////////////////////////////////////////////////////
	
	toString: function toString() {
		return (this.constructor.name || 'GeneticAlgorithm')+ '('+ JSON.stringify(this) +')';
	}
}); // declare GeneticAlgorithm.
	
/** static GeneticAlgorithm.selections:
	Bundle of standard selection methods. A selection function takes the
	amount of elements to be selected and returns an array of selected
	elements.
*/
GeneticAlgorithm.selections = {
	/** GeneticAlgorithm.selection.rankSelection(count=2):
		Makes a selection where each element's probability of being selected is
		proportional to its position in the state.
	*/
	rankSelection: function rankSelection(count) {
		count = isNaN(count) ? 2 : +count;
		var len = this.state.length,
			randoms = this.random.randoms(count, 0, len * (len + 1) / 2 - 1),
			selected = [];
		randoms.sort(function (x, y) { 
			return x - y; 
		});
		this.state.forEach(function (element) {
			for (var i = 0; i < count; i++) {
				randoms[i] += i - len;
			}
			if (randoms[0] <= 0) {
				selected.push(element);
				randoms.shift();
			}
		});
		if (selected.length < count) { // Should not happen.
			selected = selected.concat(this.state.slice(0, count - selected.length));
		}
		return selected;
	},
	
	/** GeneticAlgorithm.selections.rouletteSelection(count=2):
		Makes a selection where each element's probability of being selected is
		proportional to its evaluation.
		Warning! This selection assumes the evaluation is being maximized.
	*/
	rouletteSelection: function rouletteSelection(count) { //FIXME
	/* this.statistics.stat('evaluations_step').minimum() .maximum() .sum()
	*/
		count = isNaN(count) ? 2 : +count;
		var len = this.state.length,
			min = this.statistics.minimum('evaluations_step'),
			sum = this.statistics.sum('evaluations_step'),
			randoms = this.random.randoms(count, 0, sum - len * min),
			selected = [];
		randoms.sort(function (x, y) { return x-y; });
		this.state.forEach(function (element) {
			for (var i = 0; i < count; i++) {
				randoms[i] += i - len;
			}
			if (randoms[0] <= 0) {
				selected.push(element);
				randoms.shift();
			}
		});
		if (selected.length < count) { // Should not happen.
			selected = selected.concat(this.state.slice(0, count - selected.length));
		}
		return selected;
	}
}; // GeneticAlgorithm.selections

/** GeneticAlgorithm.crossovers:
	Bundle of standard crossover methods. A crossover function takes an 
	array of parent elements and returns an array of sibling elements.
*/
GeneticAlgorithm.crossovers = {
	/** GeneticAlgorithm.crossovers.singlepointCrossover(parents):
		Given two parents, returns an array of two new elements built with one
		half of each parent. The cutpoint is chosen randomly.
	*/
	singlepointCrossover: function singlepointCrossover(parents) {
		basis.raiseIf(!Array.isArray(parents) || parents.length < 2, "A two parent array is required.");
		var cut = this.random.randomInt(this.length - 1) + 1,
			values0 = parents[0].values,
			values1 = parents[1].values,
			elementConstructor = this.problem.representation;
		return [ 
			new elementConstructor(values0.slice(0, cut).concat(values1.slice(cut))),
			new elementConstructor(values1.slice(0, cut).concat(values0.slice(cut)))
		];
	}	
}; // GeneticAlgorithm.crossovers
	
/** GeneticAlgorithm.mutations:
	Bundle of standard mutation methods.
*/
GeneticAlgorithm.mutations = {
	/** GeneticAlgorithm.mutations.singlepointUniformMutation(element):
		Sets a randomly selected gene to a uniform random value.
	*/
	singlepointUniformMutation: function singlepointUniformMutation(element) {
		return element.modification(this.random.randomInt(element.length), element.randomValue());
	},
		
	/** GeneticAlgorithm.mutations.uniformMutation(maxPoints=Infinity):
		Builds a mutation function that makes at least one and up to maxPoints 
		mutations, changing a randomly selected gene to a uniform random value.
	*/
	uniformMutation: function uniformMutation(maxPoints) {
		max = isNaN(maxPoints) ? Infinity : +maxPoints;
		return function mutation(element) {
			var times = maxPoints;
			element = new element.constructor(element.values); // Copy element.
			do {
				element.values[this.random.randomInt(element.length)] = element.randomValue();
			} while (this.random.randomBool(this.mutationRate) && --times > 0);
			return element;
		};
	},
	
	/** GeneticAlgorithm.mutations.singlepointBiasedMutation(element):
		Sets a randomly selected gene to random deviation of its value, with a
		triangular distribution.
	*/
	singlepointBiasedMutation: function singlepointBiasedMutation(element) {
		return element.modification(this.random.randomInt(element.length),
			Math.max(element.minimumValue, Math.min(element.maximumValue, 
				element.values[i] + this.random.random() - this.random.random()
			))
		);
	}
}; // GeneticAlgorithm.mutations


/** inveniemus/src/problems/SumOptimization.js
	Many reference problems and related utilities are provided in this file.
	
	@author <a href="mailto:leonardo.val@creatartis.com">Leonardo Val</a>
	@licence MIT Licence
*/

problems.SumOptimization = basis.declare(Problem, { ////////////////////////////
	title: "Sum optimization",
	description: "Very simple problem based on optimizing the elements' values sum.",

	/** new problems.SumOptimization(params):
		Very simple problem based on optimizing the elements' values sum. The
		params argument should include the 'target' number.
	*/
	constructor: function SumOptimization(params) {
		Problem.call(this, params);
		basis.initialize(this, params)
			.number('target', { coerce: true, defaultValue: -Infinity });
	},
	
	representation: basis.declare(Element, {
		evaluate: function evaluate() {
			return this.evaluation = iterable(this.values).sum();
		}
	}),
	
	/** problems.SumOptimization.suffices(elements):
		Checks if the best element's values add up to the target value.
	*/
	suffices: function suffices(elements) {
		return iterable(elements[0].values).sum() === this.target;
	},
	
	/** problems.SumOptimization.compare(element1, element2):
		The comparison between elements depends on this problem's target. For
		a Infinity maximization is applied, for -Infinity minimization, and
		for every other number approximation.
	*/
	compare: function compare(element1, element2) {
		return this.target === -Infinity ? this.minimization(element1, element2)
			: this.target === Infinity ? this.maximization(element1, element2)
			: this.approximation(this.target, element1, element2);
	}
}); // declare SumOptimization.


/** inveniemus/src/problems/HelloWorld.js
	Many reference problems and related utilities are provided in this file.
	
	@author <a href="mailto:leonardo.val@creatartis.com">Leonardo Val</a>
	@licence MIT Licence
*/
problems.HelloWorld = basis.declare(Problem, { /////////////////////////////////
	title: "Hello world",
	description: "Simple problem where each element is a string, and the "+
		"optimization goes towards the target string.",
	
	/** new problems.HelloWorld(params):
		Simple problem where each element is a string, and the optimization 
		goes towards the target string. The string to match is specified by the
		'target' parameter.
	*/	
	constructor: function HelloWorld(params){
		Problem.call(this, params);
		basis.initialize(this, params)
			.string('target', { coerce: true, defaultValue: 'Hello world!' });
		
		var target = this.target,
			__target__ = iterable(target).map(function (c) {
				return c.charCodeAt(0);
			}).toArray();
		// Ad hoc Element declaration.
		this.representation = basis.declare(Element, {
			length: target.length,
			minimumValue: 32,
			maximumValue: 254,
			suffices: function suffices() {
				return this.mapping() === target;
			},
			evaluate: function evaluate() {
				return this.evaluation = this.manhattanDistance(__target__, this.values);
			},
			mapping: function mapping() {
				return iterable(this.values).map(function (n) {
					return String.fromCharCode(n | 0);
				}).join('');
			}
		});
	},
	
	compare: Problem.prototype.minimization
}); // declare HelloWorld.


/** inveniemus/src/problems/NQueensPuzzle.js
	Many reference problems and related utilities are provided in this file.
	
	@author <a href="mailto:leonardo.val@creatartis.com">Leonardo Val</a>
	@licence MIT Licence
*/
problems.NQueensPuzzle = basis.declare(Problem, { ////////////////////////////
	title: "N-queens puzzle",
	description: "Generalized version of the classic problem of placing "+
		"8 chess queens on an 8x8 chessboard so that no two queens attack each other.",
	
	/** new problems.NQueensPuzzle(params):
		Generalized version of the classic problem of placing 8 chess queens on 
		an 8x8 chessboard so that no two queens attack each other. The amount
		of queens and board dimensions is specified by the N parameter.
	*/	
	constructor: function NQueensPuzzle(params){
		Problem.call(this, params);
		basis.initialize(this, params)
			.integer('N', { coerce: true, defaultValue: 8 });
		
		// Ad hoc Element declaration.
		var rowRange = basis.Iterable.range(this.N).toArray();
		/** problems.NQueensPuzzle.representation:
			The representation is an array of N positions, indicating the row of
			the queen for each column. Its evaluation is the count of diagonals
			shared by queens pairwise.
		*/
		this.representation = basis.declare(Element, {
			length: this.N,
			suffices: function suffices() {
				return this.evaluation === 0;
			},
			evaluate: function evaluate() {
				var rows = this.mapping(),
					count = 0;
				rows.forEach(function (row, i) {
					for (var j = 1; i + j < rows.length; j++) {
						if (rows[j] == row + j || rows[j] == row - j) {
							count++;
						}
					}
				});
				return this.evaluation = count;
			},
			mapping: function mapping() {
				return this.setMapping(rowRange);
			}
		});
	},
	
	compare: Problem.prototype.minimization
}); // declare NQueensPuzzle


/** inveniemus/src/problems/KnapsackProblem.js
	Many reference problems and related utilities are provided in this file.
	
	@author <a href="mailto:leonardo.val@creatartis.com">Leonardo Val</a>
	@licence MIT Licence
*/
problems.KnapsackProblem = basis.declare(Problem, { ////////////////////////////
	title: "Knapsack problem",
	description: "Given a set of items with a cost and a worth, select a subset "+
		" maximizing the worth sum but not exceeding a cost limit.",
	
	/** problems.KnapsackProblem.items:
		The superset of all candidate solutions. Must be an object with each
		item by name. Each item must have a cost and a worth, and may have an
		amount (1 by default).
	*/
	items: {
		itemA: { cost: 12, worth:  4 }, 
		itemB: { cost:  2, worth:  2 }, 
		itemC: { cost:  1, worth:  2 }, 
		itemD: { cost:  1, worth:  1 },
		itemE: { cost:  4, worth: 10 }
	},
	
	/** new problems.KnapsackProblem(params):
		Classic combinatorial optimization problem, based on a given a set of 
		items, each with a cost and a worth. The solution is a subset of items
		with maximum worth sum that does not exceed a cost limit.
	*/	
	constructor: function KnapsackProblem(params){
		Problem.call(this, params);
		basis.initialize(this, params)
			/** problems.KnapsackProblem.limit=15:
				Cost limit that candidate solution should not exceed.
			*/
			.number('limit', { coerce: true, defaultValue: 15 })
			/** problems.KnapsackProblem.defaultAmount=1:
				Amount available for each item by default.
			*/
			.integer('amount', { coerce: true, defaultValue: 1, minimum: 1 })
			.object('items', { ignore: true });
		
		// Ad hoc Element declaration.
		var problem = this;
		/** problems.KnapsackProblem.representation:
			The representation is an array with a number for each item. This
			number holds the selected amount for each item (from 0 up to the
			item's amount).
		*/
		this.representation = basis.declare(Element, {
			length: Object.keys(this.items).length,
			evaluate: function evaluate() {
				var selection = this.mapping(),
					worth = 0,
					cost = 0;
				Object.keys(selection).forEach(function (name) {
					var item = problem.items[name],
						amount = selection[name];
					worth += item.worth * amount;
					cost += item.cost * amount;
				});
				return this.evaluation = cost > problem.limit ? -worth : worth;
			},
			mapping: function mapping() {
				var selection = {},
					keys = Object.keys(problem.items);
				keys.sort();
				iterable(this.values).zip(keys).forEach(function (pair) {
					var item = problem.items[pair[1]],
						amount = pair[0] * (1 + (+item.amount || 1)) | 0;
					selection[pair[1]] = amount;
				});
				return selection;
			}
		});
	},
	
	compare: Problem.prototype.maximization
}); // declare KnapsackProblem
return exports;
});