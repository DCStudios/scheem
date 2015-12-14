var PEG = require( "pegjs" );
var assert = require( "assert" ).deepEqual;
var fs = require( "fs" );

var chalk = require("chalk");
var red = chalk.red;
var green = chalk.green;
var bold = chalk.bold;

var parser = PEG.buildParser( fs.readFileSync( "scheem.peg", "UTF-8" ) ).parse;
var parsedCode = parseScheem( fs.readFileSync( "code.scheem", "UTF-8" ), parser );

var numTest=0;
var numTestPassed=0;

// -- Tests --------------------------------------------------------

	function testAll() {
		console.log( "Syntax\n" );
		testError( "(5 ", "SyntaxError", "Test parentesis mismatch" );
		testError( "(+ + 5)", "IllegalReferenceError", "Test accessing '+' operator as variable" );
		testError( "(+ Begin 5)", "IllegalReferenceError", "Test accessing 'Begin' keyword as variable" );
		testError( "(+ car 5)", "IllegalReferenceError", "Test accessing 'car' keyword as variable" );

		console.log( "\nNumbers\n" );
		test( "5", 5, "Test number" );
		test( "(5 2.1 4 -82)", [5,2.1,4,-82], "Test list of numbers" );

		console.log( "\nOperations\n" );
		test( "(+ 4 2)", 6, "Test add" );
		test( "(- 4 2)", 2, "Test sub" );
		test( "(* 4 2)", 8, "Test mul" );
		test( "(/ 4 2)", 2, "Test div" );
		test( "(% 5 3)", 2, "Test mod" );
		test( "(+ 1 (* 2 (/ 9 3)))", 7, "Test operation order" );

		console.log( "\nQuotes\n" );
		test( "'53", 53, "Test quoted number" );
		test( "'test", "test", "Test quoted word" );
		test( "'(test 32)", ["test",32], "Test quoted list" );
		test( "'(test '(32 32) (+ 1 1))", ["test",["quote",[32,32]],["+",1,1]], "Test recursive quotes" );

		console.log( "\nList Manipulation\n" );
		test( "(cons 5 '(4 3 2 1))", [5,4,3,2,1], "Test adding to list" );
		test( "(car '(hello world))", "hello", "Test getting first item from list" );
		test( "(cdr '(1 3 5 9))", [3,5,9], "Test getting all items from list but first item" );

		console.log( "\nBegin\n" );
		test( "(Begin (+ 1 1)(+ 2 2))", 4, "Test multiple instructions" );

		console.log( "\nVariables\n" );
		testV( "(define x 5)", "x", 5, "Test define var" );
		testV( "(Begin (define hello 0)(set! hello 8))", "hello", 8, "Test set! var" );
		testError( "(Begin (define x 0)(set! x y))", "UndefinedVariableAccessError", "Test invalid var" );
		test( "(Begin (define x 5)(define y x)(+ x y))", 10, "Test setting var to another var" );

		console.log( "\nComparisions\n" );
		test( "(= 1 1)", "#t", "Test valid equal" );
		test( "(= 1 2)", "#f", "Test invalid equal" );
		test( "(< 1 2)", "#t", "Test valid smaller than" );
		test( "(< 2 1)", "#f", "Test invalid smaller than" );
		test( "(> 2 1)", "#t", "Test valid larger than" );
		test( "(> 1 2)", "#f", "Test invalid larger than" );

		console.log( "\nBranching\n" );
		test( "(if #t 1 0)", 1, "Test branching true" );
		test( "(if #f 1 0)", 0, "Test branching false" );
		test( "(if (= 1 1) 1 0)", 1, "Test branching comparision true" );
		test( "(if (> 1 1) 1 0)", 0, "Test branching comparision false" );
		test( "(if (= 1 1) (if (> 2 1) 1 0)(if (< 2 1) 1 0))", 1, "Test nested branching true" );
		test( "(if (= 1 2) (if (> 2 1) 1 0)(if (< 2 1) 1 0))", 0, "Test nested branching false" );

		console.log( "\nScopes\n" );
		test( "(let-one x 2 (* x 3))", 6, "Test simple scope" );
		test( "(let-one x 99 (let-one x 2.5 (+ x 3)))", 5.5, "Test nested variables with same name" );
		testError( "(Begin (+ (let-one x 5 0) x))", "UndefinedVariableAccessError", "Test invalid out of scope access" );

		console.log( "\nResults\n" );
		if( numTestPassed == numTest ) {
			console.log( "   "+numTestPassed+"/"+numTest+" tests PASSED." );
			console.log( green( " ✔ "+(numTest-numTestPassed)+" test FAILED.\n" ) );
			console.log( green("\nSUCCESS\n") );
		}
		else {
			console.log( "   "+numTestPassed+"/"+numTest+" tests PASSED." );
			console.log(red(bold(
				" ✗ "+(numTest-numTestPassed)+" test"+( numTest-numTestPassed>1?"s":"")+" FAILED.\n"
			)));
			console.log( red("\nFAILURE\n") );
		}
	}

	function test( code, expected, description ) {
		var result = interpretScheem( parser( code ), { binds:{} } );
		var jsonresult = JSON.stringify(result);
		var passed = JSON.stringify(expected) == jsonresult;
		if( passed ) console.log( green( " ✔ "+description ) );
		else console.log( red( bold( " ✗ "+description ) ) );

		numTest++;
		if( passed ) numTestPassed++;
	}

	function testV( code, varName, varValue, description ) {
		var vars = { binds:{} };
		var result = interpretScheem( parser( code ), vars );
		var passed = JSON.stringify(getVar(vars,varName))==JSON.stringify(varValue)
		if( passed ) console.log( green( " ✔ "+description ) );
		else console.log( red( bold( " ✗ "+description ) ) );

		numTest++;
		if( passed ) numTestPassed++;
	}

	function testError( code, errorName, description ) {
		var passed = false;
		var error;
		var vars = { binds:{} };
		try {
			interpretScheem( parser( code ), vars );
		}
		catch( err ) {
			if( err.name == errorName ) passed = true;
			else error = err;
		}
		if( passed ) console.log( green( " ✔ "+description ) );
		else {
			console.log( red( bold( " ✗ "+description ) ) );
			console.log( "    --> Vars: "+JSON.stringify(vars) );
			console.log( "    --> Result: "+JSON.stringify(error.name) );
		}

		numTest++;
		if( passed ) numTestPassed++;
	}

	testAll();

// -- Scheem parser/interpreter ------------------------------------

	function parseScheem( code, parser ) {
		var result;

		try {
			result = parser( code );
		}
		catch( error ) {

			if( error.name == "SyntaxError" ) {
				console.log( error.message );
				console.log( " > at line "+error.location.start.line );
			}
			else console.log( error );

			result = null;
		}

		return result;
	}

	function interpretScheem( code, vars ) {
		if( typeof vars === "undefined" ) vars = { binds:{} };
		else if( vars == {} ) vars.binds = {};
		return eval( code, vars );
	}

	function eval( expression, vars ) {

		// If value is a number, return it directly
		if( typeof expression === "number" ) return expression;
		if( !isNaN( expression ) ) return parseFloat( expression );

		// If value is a list, then operate it
		if( typeof expression === "object" ) {
			if( isOperator( expression[0] ) ) return operate( expression[0], expression[1], expression[2], vars );
			if( isKeyword( expression[0] ) ) return handleKeyword( expression, vars );
		}

		// If it's a string, then it's an identifier
		if( typeof expression === "string" ) {
			// If value is a variable, return it's value
			if( varExists( vars, expression ) ) return getVar( vars, expression );

			// If value is a constant, return it directly
			if( isConstant( expression ) ) return expression;

			// If it's a keyword or an operator, return an error
			if( isOperator( expression ) ) throw {
				name: "IllegalReferenceError",
				message: "Tried to reference operator '"+expression+"' as a variable."
			};

			if( isKeyword( expression ) ) throw {
				name: "IllegalReferenceError",
				message: "Tried to reference keyword '"+expression+"' as a variable."
			};


			// Otherwise return an error
			throw {
				name:"UndefinedVariableAccessError",
				message:"Tried to access undefined variable '"+expression+"'"
			};
		}

		// If dunno what to do, just return expression directly
		return expression;
	}

	function isConstant( value ) {
		switch( value ) {
			case "#t":
			case "#f": return true;
			default: return false;
		}
	}

	function isOperator( value ) {
		switch( value ) {
			case "=":
			case "<":
			case ">":
			case "+":
			case "-":
			case "*":
			case "/":
			case "%": return true;
			default: return false;
		}
	}

	function operate( operator, left, right, vars ) {
		switch( operator ) {
			case "=": return ( eval( left,vars) == eval( right,vars ) ? "#t" : "#f" );
			case "<": return ( eval( left,vars) < eval( right,vars ) ? "#t" : "#f" );
			case ">": return ( eval( left,vars) > eval( right,vars ) ? "#t" : "#f" );
			case "+": return eval( left,vars ) + eval( right,vars );
			case "-": return eval( left,vars ) - eval( right,vars );
			case "*": return eval( left,vars ) * eval( right,vars );
			case "/": return eval( left,vars ) / eval( right,vars );
			case "%": return eval( left,vars ) % eval( right,vars );
			default: return null;
		}
	}

	function isKeyword( value ) {
		switch( value ) {
			case "Begin":
			case "quote":
			case "define":
			case "set!":
			case "cons":
			case "car":
			case "cdr":
			case "if":
			case "let-one": return true;
			default: return false;
		}
	}

	function handleKeyword( values, vars ) {
		switch( values[0] ) {
			case "Begin": return doBegin( values, vars );

			case "quote": return values[1];

			case "define": defineVar( vars, values[1], eval( values[2], vars ) ); return 0;
			case "set!": setVar( vars, values[1], eval( values[2],vars ) ); return 0;

			case "cons": return [eval(values[1],vars)].concat( eval(values[2],vars) );
	        case "car": return eval(values[1],vars)[0];
	        case "cdr": return eval(values[1],vars).slice(1);

			case "if":
				if( eval( values[1], vars ) == "#t" ) return eval( values[2], vars );
				else return eval( values[3], vars );
			break;

			case "let-one":
				var scope = {
					binds:{},
					outer:vars
				};
				defineVar( scope, values[1], eval( values[2], vars ) );
			return eval( values[3], scope );

			default: return null;
		}
	}

	function doBegin( values, vars ) {
		var i,res;
		for( i=1; i<values.length; i++ ) {
			res = eval( values[i], vars );
		}
		return res;
	}

// -- Helper to deal with variables in Scheem ----------------------

	function defineVar( vars, name, value ) {
		vars.binds[name] = value;
	}

	function setVar( vars, name, value ) {
		if( typeof vars.binds[name] !== "undefined" ) vars.binds[name] = value;
		else if( typeof vars.outer !== "undefined" ) setVar( vars.outer, name, value );
		else {
			throw {
				name:"UndefinedVariableAccessError",
				message:"Trying to set undefined variable '"+name+"'"
			};
		}
	}

	function varExists( vars, name ) {
		if( typeof vars.binds[name] !== "undefined" ) return true;
		else if( typeof vars.outer !== "undefined" ) return varExists( vars.outer, name );
		return false;
	}

	function getVar( vars, name ) {
		if( typeof vars.binds[name] !== "undefined" ) return vars.binds[name];
		else if( typeof vars.outer !== "undefined" ) return getVar( vars.outer, name );
		throw {
			name:"UndefinedVariableAccessError",
			message:"Trying to acces undefined variable '"+name+"'"
		};
	}

// -----------------------------------------------------------------

// Export for NodeJS
if( typeof module !== "undefined" ) {
	module.exports.interpretScheem = interpretScheem;
}
