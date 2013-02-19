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
// Virtual Agents
//============================================================================

// Front direction vectors associated with ant directions
const FRONT_VECTORS = 
[
	new Vector2( 0,-1),
	new Vector2( 1, 0),
	new Vector2( 0, 1),
	new Vector2(-1, 0)
];

// Side direction vectors associated with ant directions
const SIDE_VECTORS = 
[
	new Vector2( 1, 0),
	new Vector2( 0, 1),
	new Vector2(-1, 0),
	new Vector2( 0,-1)
];	

// Possible directions
const AGENT_DIR_UP    = 0;
const AGENT_DIR_RIGHT = 1;
const AGENT_DIR_DOWN  = 2;
const AGENT_DIR_LEFT  = 3;

// Possible actions
const ACTION_DO_NOTHING     = 0;
const ACTION_MOVE_FORWARD   = 1;
const ACTION_ROTATE_LEFT    = 2;
const ACTION_ROTATE_RIGHT   = 3;
const ACTION_CONSUME        = 4;
const ACTION_REPRODUCE      = 5;
const ACTION_BUILD          = 6;

// Total number of possible actions
const NUM_ACTIONS = ACTION_REPRODUCE + 1;

// Starting food, water and energy quantities
const START_FOOD = 250;
const START_WATER = 500;
const START_ENERGY = 250;

// Maximum food and water and energy quantities
const MAX_FOOD = 5000;
const MAX_WATER = 5000;
const MAX_ENERGY = 5000;

// Quantities of food and water extracted by consumption
const FOOD_CONS_QTY = 250;
const WATER_CONS_QTY = 500;

// Energy cost to produce offspring
const OFFSPRING_COST = START_ENERGY + START_FOOD + 100;

// Energy cost to build a wall block
const BUILD_COST = 50;

/**
Base agent class
*/
function Agent()
{
    // Reset all agent parameters
    this.reset();
}

/**
Reset the agent's parameters to their initial values
*/
Agent.prototype.reset = function ()
{
	// Reset the position
	this.position = new Vector2(0, 0);
	
	// Select a random direction for the ant
	this.direction = randomInt(AGENT_DIR_UP, AGENT_DIR_LEFT);
	
	// Reset the sleeping state
	this.sleeping = false;
	
	// Reset the agent's age
	this.age = 0;
	
	// Reset the food amount
    this.food = START_FOOD;
	
	// Reset the water amount
	this.water = START_WATER;
	
	// Reset the energy level
	this.energy = START_ENERGY;
}

/**
Update the state of the agent
*/
Agent.prototype.update = function ()
{
	// Increment the agent's age
    this.age += 1;

    // If we have food and water	
    if (this.food > 0 && this.water > 0)
    {
	    // If water is the limiting element
	    if (this.food >= this.water)
	    {
            assert (
                this.food > 0,
                'no food available'
            );

		    // Food + water => energy
		    this.energy	+= this.water;
		    this.food	-= this.water;
		    this.water  = 0;
	    }
	    else
	    {
            assert (
                this.water > 0,
                'no water available'
            );

		    // Food + water => energy
		    this.energy	+= this.food;
		    this.water  -= this.food;
		    this.food	= 0;
	    }
    }
	
	// Decrement the energy level, living cost energy
	this.energy -= 1;

	// Think and choose an action to perform
	var action = this.think();

	// Switch on the action
	switch (action)
	{
        // To do nothing
        case ACTION_DO_NOTHING:
        {
        }
        break;

		// To move forward
		case ACTION_MOVE_FORWARD:
		{
			// Attempt to move to the cell just ahead
			var pos = this.frontCellPos(0, 1);
			world.moveAgent(this, pos.x, pos.y);
		}
		break;

		// To rotate left
		case ACTION_ROTATE_LEFT:
		{
			// Shift our direction to the left
			this.direction = Math.abs((this.direction - 1) % 4);
		}
		break;

		// To rotate right
		case ACTION_ROTATE_RIGHT:
		{
			// Shift our direction to the right
			this.direction = Math.abs((this.direction + 1) % 4);
		}
		break;
		
		// To consume resources
		case ACTION_CONSUME:
		{
			// Attempt to consume what is in front of us
			this.consume();
		}
		break;

        // To make offspring
        case ACTION_REPRODUCE:
        {
            // Attempt to reproduce
            this.reproduce();
        }
        break;

        // To build a wall block
        case ACTION_BUILD:
        {
            // Attempt to build
            this.build();
        }
        break;

        default:
        error('invalid agent action');
	}

    assert(
        this.direction >= AGENT_DIR_UP &&
        this.direction <= AGENT_DIR_LEFT,
        'invalid agent direction after update'
    );
}

/**
Process environmental inputs and choose an action.
To be set on each agent
*/
Agent.prototype.think = function ()
{
    error('think function not set');
}

/**
Test if this agent is still alive
*/
Agent.prototype.isAlive = function ()
{
	// The ant is alive if it still has energy
	return (this.energy > 0);
}

/**
Perform the consumption action
*/
Agent.prototype.consume = function ()
{
	// compute the position of the cell just ahead
	var pos = this.frontCellPos(0, 1);

	// If this is a plant we can eat
	if (
        this.food + FOOD_CONS_QTY <= MAX_FOOD &&
        world.eatPlant(pos.x, pos.y) === true)
	{
		// Gain food
		this.food += FOOD_CONS_QTY;
				
		// Eating successful
		return true;
	}
	
	// Otherwise, if this cell is water
	else if (
        this.water + WATER_CONS_QTY <= MAX_WATER &&
        world.cellIsType(pos.x, pos.y, CELL_WATER) === true)
	{
		// Gain water
		this.water += WATER_CONS_QTY;
		
		// Consumption successful
		return true;
	}
	
	// Consumption failed
	return false;
}

/**
Attempt to produce offspring
*/
Agent.prototype.reproduce = function ()
{
    // If we do not have enough energy to produce offspring, do nothing
    if (this.energy < OFFSPRING_COST)
        return;

    // Subtract the energy required to produce offspring
    this.energy -= OFFSPRING_COST;

    // Produce offspring from this agent
    genAlg.makeOffspring(this);
}

/**
To build a wall block
*/
Agent.prototype.build = function ()
{
    // If we do not have enough energy to build a block, do nothing
    if (this.energy < BUILD_COST)
        return;

    // Subtract the energy require to build
    this.energy -= BUILD_COST;

    // Get the position of the cell ahead of us
    pos = this.frontCellPos(0, 1);

    // Try to build a block at the cell in front of us
    world.buildBlock(pos.x, pos.y);
}

/**
Compute a cell position relative to our direction
*/
Agent.prototype.frontCellPos = function (x, y)
{
	// compute the absolute cell position
    var frontVec = Vector2.scalarMul(FRONT_VECTORS[this.direction], y);
    var sideVec = Vector2.scalarMul(SIDE_VECTORS[this.direction], x);
	var cellPos = Vector2.add(this.position, Vector2.add(frontVec, sideVec));
		
	// Return the computed cell position
	return cellPos;
}

/**
@class Ant agent constructor
@extends Agent
*/
function AntAgent(connVecs)
{
    assert (
        connVecs instanceof Array,
        'expected connection vectors'
    );

    assert (
        connVecs.length === AntAgent.numStateVars,
        'need connection vectors for each state var'
    );

    // Store the connection vectors
    this.connVecs = connVecs;

    // Compile the think function
    this.think = this.compile();

    // Initialize the state variables
    for (var i = 0; i < AntAgent.numStateVars; ++i)
        this['s' + i] = 0;        
}
AntAgent.prototype = new Agent();

/**
Number of visible cell inputs.

Agent's view:
     F
     |
   X X X
L- X X X - R
   X A x

8 visible cells x 5 attributes per cell = 40 boolean inputs
*/
AntAgent.numCellInputs = 40;

/**
Number of random inputs
*/
AntAgent.numRndInputs = 4;

/*
Number of field inputs.
3 local properties (food, water, energy).
*/
AntAgent.numFieldInputs = 3;

/*
Total number of agent inputs
*/
AntAgent.numInputs = 
    AntAgent.numCellInputs + 
    AntAgent.numRndInputs +
    AntAgent.numFieldInputs;

/**
Number of agent state variables
*/
AntAgent.numStateVars = 16 + NUM_ACTIONS;

/**
Maximum number of inputs per connection vector
*/
AntAgent.maxStateInputs = 8;

/**
Maximum neural connection weight
*/
AntAgent.maxWeight = 10.0;

/**
Minimum neural connection weight
*/
AntAgent.minWeight = -10;

/**
Add an input to a state connection vector
*/
AntAgent.addStateInput = function (connVec)
{
    assert (
        connVec.inputs.length < AntAgent.maxStateInputs,
        'too many inputs'
    );

    // Until a new input is added
    while (true)
    {
        // Choose a random input
        if (randomInt(0, 1) === 0)
            var varName = 'i' + randomInt(0, AntAgent.numInputs - 1);
        else
            var varName = 'this.s' + randomInt(0, AntAgent.numStateVars - 1);

        // If the variable is already in the list, skip it
        if (connVec.inputs.indexOf(varName) !== -1)
            continue;

        // Add the variable to the inputs
        connVec.inputs.push(varName);

        // Choose a random weight for the connection
        connVec.weights.push(
            randomFloat(AntAgent.minWeight, AntAgent.maxWeight)
        );

        // Break out of the loop
        break;
    }
}

/**
Factory function to create a new ant agent
*/
AntAgent.newAgent = function ()
{
    /**
    Generate a connection vector for a state variable
    */
    function genConnVector()
    {
        // Choose the number of connections for this 
        var numInputs = randomInt(1, AntAgent.maxStateInputs);

        var connVec = {
            inputs: [],
            weights: []
        };

        // Until all inputs are added
        for (var numAdded = 0; numAdded < numInputs;)
        {
            // Add an input connection
            AntAgent.addStateInput(connVec);

            // Increment the number of inputs added
            ++numAdded;
        }

        // Return the connection vector
        return connVec;
    }

    assert (
        AntAgent.numStateVars >= NUM_ACTIONS,
        'insufficient number of state variables'
    );

    // Array for the state variable connection vectors
    var connVecs = new Array(AntAgent.numStateVars);

    // Generate connections for each state variable
    for (var i = 0; i < AntAgent.numStateVars; ++i)
        connVecs[i] = genConnVector();

    // Create the new agent
    return new AntAgent(connVecs);
}

/**
Return a mutated version of an agent
*/
AntAgent.mutate = function (agent, mutProb)
{
    assert (
        agent instanceof AntAgent,
        'expected ant agent'
    );

    assert (
        mutProb >= 0 && mutProb <= 1,
        'invalid mutation probability'
    );

    // Array of connection vectors
    var connVecs = [];

    // For each connection vector
    for (var i = 0; i < agent.connVecs.length; ++i)
    {
        var oldVec = agent.connVecs[i];

        // Copy the inputs and weights
        var newVec = {
            inputs : oldVec.inputs.slice(0),
            weights: oldVec.weights.slice(0)
        };

        // For each mutation attempt
        for (var j = 0; j < AntAgent.maxStateInputs; ++j)
        {
            // If the mutation probability is not met, try again
            if (randomFloat(0, 1) >= mutProb)
                continue;

            // Get the current number of inputs
            var numInputs = newVec.inputs.length;

            // If we should remove an input
            if (randomBool() === true)
            {
                // If there are too few inputs, try again
                if (numInputs <= 1)
                    continue;

                // Choose a random input and remove it
                var idx = randomInt(0, numInputs - 1);
                newVec.inputs.splice(idx, 1);
                newVec.weights.splice(idx, 1);
            }

            // If we should add an input
            else
            {
                // If there are too many inputs, try again
                if (numInputs >= AntAgent.maxStateInputs)
                    continue;

                // Add an input to the rule
                AntAgent.addStateInput(newVec);
            }
        }

        // Add the mutated connection vector
        connVecs.push(newVec);
    }

    // Create the new agent
    return new AntAgent(connVecs);
}

/**
Neural network activation function.
Fast approximation to tanh(x/2)
*/
AntAgent.actFunc = function (x)
{
	if (x < 0)
	{
		x = -x;
		x = x * (6 + x * (3 + x));
		return -x / (x + 12);
	}
	else
	{
		x = x * (6 + x * (3 + x));
		return x / (x + 12);
	}
}

/**
Compile a think function for the ant agent
*/
AntAgent.prototype.compile = function ()
{
    // Generated source string
    var src = '';

    /**
    Add a line of source input
    */
    function addLine(str)
    {
        if (str === undefined)
            str = '';

        src += str + '\n';

        //dprintln(str);
    }

    addLine('\tassert (this instanceof AntAgent)');
    addLine();

    // Next cell input index
    var cellInIdx = 0;

    // For each horizontal cell position
    for (var x = -1; x <= 1; ++x)
    {
        // For each vertical cell position
        for (var y = 0; y <= 2; ++y)
        {
            // If this is the agent's position, skip it
            if (x === 0 && y === 0)
                continue;

            // Compute the absolute cell position
            addLine('\tvar pos = this.frontCellPos(' + x + ', ' + y + ');');

            addLine('\tif (');
            addLine('\t\tpos.x >= 0 && pos.y >= 0 &&');
            addLine('\t\tpos.x < world.gridWidth && pos.y < world.gridHeight)');
            addLine('\t{');
            addLine('\t\tvar cell = world.getCell(pos.x, pos.y);');
            addLine('\t\tvar i' + (cellInIdx + 0) + ' = (cell.agent !== null)? 1:0;');
            addLine('\t\tvar i' + (cellInIdx + 1) + ' = (cell.type === CELL_WALL)? 1:0;');
            addLine('\t\tvar i' + (cellInIdx + 2) + ' = (cell.type === CELL_WATER)? 1:0;');
            addLine('\t\tvar i' + (cellInIdx + 3) + ' = (cell.type === CELL_PLANT)? 1:0;');
            addLine('\t\tvar i' + (cellInIdx + 4) + ' = (cell.type === CELL_EATEN)? 1:0;');
            addLine('\t}');
            addLine('\telse');
            addLine('\t{');
            addLine('\t\tvar i' + (cellInIdx + 0) + ' = 0;');
            addLine('\t\tvar i' + (cellInIdx + 1) + ' = 1;');
            addLine('\t\tvar i' + (cellInIdx + 2) + ' = 0;');
            addLine('\t\tvar i' + (cellInIdx + 3) + ' = 0;');
            addLine('\t\tvar i' + (cellInIdx + 4) + ' = 0;');
            addLine('\t}');

            // Increment the cell input index
            cellInIdx += 5;
        }
    }
    addLine();

    // For each random input
    for (var i = 0; i < AntAgent.numRndInputs; ++i)
    {
        var inIdx = AntAgent.numCellInputs + i;

        addLine('\tvar i' + inIdx + ' = randomFloat(-1, 1);');
    }

    /**
    Generate a field input
    */
    function genFieldInput(idx, field)
    {
        var inIdx = AntAgent.numCellInputs + AntAgent.numRndInputs + idx;

        addLine('\tvar i' + inIdx + ' = ' + field + ';');
    }

    /**
    Generate a state variable update computation
    */
    function genUpdate(connVec)
    {
        var src = '';

        src += 'AntAgent.actFunc(';

        for (var i = 0; i < connVec.inputs.length; ++i)
        {
            var input = connVec.inputs[i];
            var weight = connVec.weights[i];

            if (i !== 0)
                src += ' + ';

            src += input + '*' + weight;
        }

        src += ')';

        return src;
    }

    // Compile the input computations
    genFieldInput(0, 'this.food');
    genFieldInput(1, 'this.water');
    genFieldInput(2, 'this.energy');
    addLine();

    // Compile the state updates
    for (var i = 0; i < this.connVecs.length; ++i)
        addLine('\tthis.s' + i + ' = ' + genUpdate(this.connVecs[i]) + ';');
    addLine();

    // Choose the action to perform
    addLine('\tvar maxVal = -Infinity;');
    addLine('\tvar action = 0;\n');
    for (var i = 0; i < NUM_ACTIONS; ++i)
    {
        var stateIdx = AntAgent.numStateVars - NUM_ACTIONS + i;

        var varName = 'this.s' + stateIdx;

        addLine('\tif (' + varName + ' > maxVal)');
        addLine('\t{');
        addLine('\t\tmaxVal = ' + varName + ';');
        addLine('\t\taction = ' + i + ';');
        addLine('\t}');
    }
    addLine();

    // Return the chosen action
    addLine('\treturn action;');

    // Compile the think function from its source
    var thinkFunc = new Function(src);

    // Return the thinking function
    return thinkFunc;
}

