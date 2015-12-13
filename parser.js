var PEG = require( "pegjs" );
var assert = require( "assert" ).deepEqual;
var fs = require( "fs" );

var parser = PEG.buildParser( fs.readFileSync( "scheem.peg", "UTF-8" ) ).parse;
var parsedCode = parseScheem( fs.readFileSync( "code.scheem", "UTF-8" ), parser );

var numTest=0;
var numTestPassed=0;
testAll();

// -- Tests --------------------------------------------------------

	function testAll() {
		console.log( "-- Numbers ----------" );
		test( "5", 5, "Test number" );
		test( "(5 2.1 4 -82)", [5,2.1,4,-82], "Test list of numbers" );

		console.log( "\n-- Operations -------" );
		test( "(+ 4 2)", 6, "Test add" );
		test( "(- 4 2)", 2, "Test sub" );
		test( "(* 4 2)", 8, "Test mul" );
		test( "(/ 4 2)", 2, "Test div" );
		test( "(% 5 3)", 2, "Test mod" );
		test( "(+ 1 (* 2 (/ 9 3)))", 7, "Test operation order" );

		console.log( "\n-- Quotes -----------" );
		test( "'53", 53, "Test quoted number" );
		test( "'test", "test", "Test quoted word" );
		test( "'(test 32)", ["test",32], "Test quoted list" );
		test( "'(test '(32 32) (+ 1 1))", ["test",["quote",[32,32]],["+",1,1]], "Test recursive quotes" );

		console.log( "\n- List Manipulation -" );
		test( "(cons 5 '(4 3 2 1))", [5,4,3,2,1], "Test adding to list" );
		test( "(car '(hello world))", "hello", "Test getting first item from list" );
		test( "(cdr '(1 3 5 9))", [3,5,9], "Test getting all items from list but first item" );

		console.log( "\n-- Begin ------------" );
		test( "(Begin (+ 1 1)(+ 2 2))", 4, "Test multiple instructions" );

		console.log( "\n-- Variables --------" );
		testV( "(define x 5)", "x", 5, "Test define var" );
		testV( "(set! hello 8)", "hello", 8, "Test set! var" );
		testV( "(set! x y)", "x", "y", "Test invalid var" );
		test( "(Begin (define x 5)(set! y x)(+ x y))", 10, "Test setting var to another var" );

		console.log( "\n-- Comparisions -----" );
		test( "(= 1 1)", "#t", "Test valid equal" );
		test( "(= 1 2)", "#f", "Test invalid equal" );
		test( "(< 1 2)", "#t", "Test valid smaller than" );
		test( "(< 2 1)", "#f", "Test invalid smaller than" );
		test( "(> 2 1)", "#t", "Test valid larger than" );
		test( "(> 1 2)", "#f", "Test invalid larger than" );

		console.log( "\n-- Branching --------" );
		test( "(if #t 1 0)", 1, "Test branching true" );
		test( "(if #f 1 0)", 0, "Test branching false" );
		test( "(if (= 1 1) 1 0)", 1, "Test branching comparision true" );
		test( "(if (> 1 1) 1 0)", 0, "Test branching comparision false" );
		test( "(if (= 1 1) (if (> 2 1) 1 0)(if (< 2 1) 1 0))", 1, "Test nested branching true" );
		test( "(if (= 1 2) (if (> 2 1) 1 0)(if (< 2 1) 1 0))", 0, "Test nested branching false" );

		console.log( "\n-- Results ----------" );
		console.log( numTestPassed+"/"+numTest+" tests PASSED." );
		console.log( (numTest-numTestPassed)+" tests FAILED." );
	}

	function test( code, expected, description ) {
		var result = interpretScheem( parser( code ), {} );
		var jsonresult = JSON.stringify(result);
		var passed = JSON.stringify(expected) == jsonresult;
		console.log( ( passed ? "PASSED" : "FAILED" ) + " - " + description );

		numTest++;
		if( passed ) numTestPassed++;
	}

	function testV( code, varName, varValue, description ) {
		var vars = {};
		var result = interpretScheem( parser( code ), vars );
		var passed = JSON.stringify(vars[varName])==JSON.stringify(varValue)
		console.log( ( passed ? "PASSED" : "FAILED" ) + " - " + description );

		numTest++;
		if( passed ) numTestPassed++;
	}

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
		return eval( code, vars );
	}

	function eval( expression, vars ) {

		// If value is a number, return it directly
		if( typeof expression === "number" ) return expression;
		if( !isNaN( expression ) ) return parseFloat( expression );

		// Do something with identifiers
		if( typeof expression === "string" ) {
			// If value is a variable, return it's value
			if( varExists( vars, expression ) ) return getVar( vars, expression );
		}

		// If value is a list, then operate it
		if( isOperator( expression[0] ) ) return operate( expression[0], expression[1], expression[2], vars );
		if( isKeyword( expression[0] ) ) return handleKeyword( expression, vars );

		// If dunno what to do, just return expression directly
		return expression;
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
			case "if": return true;
			default: return false;
		}
	}

	function handleKeyword( values, vars ) {
		switch( values[0] ) {
			case "Begin": return doBegin( values, vars );

			case "quote": return values[1];

			case "define":
			case "set!": setVar( vars, values[1], eval( values[2],vars ) ); return 0;

			case "cons": return [eval(values[1],vars)].concat( eval(values[2],vars) );
	        case "car": return eval(values[1],vars)[0];
	        case "cdr": return eval(values[1],vars).slice(1);

			case "if":
				if( eval( values[1], vars ) == "#t" ) return eval( values[2], vars );
				else return eval( values[3], vars );
			break;

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

	function setVar( vars, name, value ) {
		vars[name] = value;
	}

	function varExists( vars, name ) {
		if( name in vars ) {
			if( typeof vars[name] !== "undefined" ) return true;
		}
		return false;
	}

	function getVar( vars, name ) {
		if( !varExists( vars, name ) ) return null;
		return vars[name];
	}

// -----------------------------------------------------------------
