/*****************************************************************************
* 
* Gradient: an Artificial Life Experiment
* Copyright (C) 2011 Maxime Chevalier-Boisvert
* 
* This file is part of Gradient.
* 
* Gradient is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* Gradient is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
* 
* You should have received a copy of the GNU General Public License
* along with Gradient.  If not, see <http://www.gnu.org/licenses/>.
* 
* For more information about this program, please e-mail the
* author, Maxime Chevalier-Boisvert at:
* maximechevalierb /at/ gmail /dot/ com
* 
*****************************************************************************/

//============================================================================
// Misc utility code
//============================================================================

/**
Assert that a condition holds true
*/
function assert(condition, errorText)
{
    if (!condition)
    {
        error(errorText);
    }
}

/**
Abort execution because a critical error occurred
*/
function error(errorText)
{
    alert('ERROR: ' + errorText);

    throw errorText;
}

/**
Test that a value is integer
*/
function isInt(val)
{
    return (
        Math.floor(val) === val
    );
}

/**
Test that a value is a nonnegative integer
*/
function isNonNegInt(val)
{
    return (
        isInt(val) &&
        val >= 0
    );
}

/**
Test that a value is a strictly positive (nonzero) integer
*/
function isPosInt(val)
{
    return (
        isInt(val) &&
        val > 0
    );
}

/**
Get the current time in seconds
*/
function getTimeSecs()
{
    return (new Date()).getTime() / 1000;
}

/**
Generate a random integer within [a, b]
*/
function randomInt(a, b)
{
    assert (
        isInt(a) && isInt(b) && a <= b,
        'invalid params to randomInt'
    );

    var range = b - a;

    var rnd = a + Math.floor(Math.random() * (range + 1));

    return rnd;
}

/**
Generate a random boolean
*/
function randomBool()
{
    return (randomInt(0, 1) === 1);
}

/**
Choose a random argument value uniformly randomly
*/
function randomChoice()
{
    assert (
        arguments.length > 0,
        'must supply at least one possible choice'
    );

    var idx = randomInt(0, arguments.length - 1);

    return arguments[idx];
}

/**
Generate a random floating-point number within [a, b]
*/
function randomFloat(a, b)
{
    if (a === undefined)
        a = 0;
    if (b === undefined)
        b = 1;

    assert (
        a <= b,
        'invalid params to randomFloat'
    );

    var range = b - a;

    var rnd = a + Math.random() * range;

    return rnd;
}

/**
Generate a random value from a normal distribution
*/
function randomNorm(mean, variance)
{
	// Declare variables for the points and radius
    var x1, x2, w;

    // Repeat until suitable points are found
    do
    {
    	x1 = 2.0 * randomFloat() - 1.0;
    	x2 = 2.0 * randomFloat() - 1.0;
    	w = x1 * x1 + x2 * x2;
    } while (w >= 1.0 || w == 0);

    // compute the multiplier
    w = Math.sqrt((-2.0 * Math.log(w)) / w);
    
    // compute the gaussian-distributed value
    var gaussian = x1 * w;
    
    // Shift the gaussian value according to the mean and variance
    return (gaussian * variance) + mean;
}

/**
Escape a string for valid HTML formatting
*/
function escapeHTML(str)
{
    str = str.replace(/\n/g, '<br>');
    str = str.replace(/ /g, '&nbsp;');
    str = str.replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');

    return str;
}

