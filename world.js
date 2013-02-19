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
// Virtual World
//============================================================================

// World update duration
const WORLD_UPDATE_TIME_SLICE = 0.1;

// Number of updates to perform between checks in fast mode
const WORLD_UPDATE_ITR_COUNT = 8;

// Zoom level constants
const WORLD_ZOOM_MIN = 0;
const WORLD_ZOOM_MAX = 5;

// Sprite size constants
const WORLD_SPRITE_SIZES = [2, 4, 8, 16, 32, 64];

// Plant respawning delay
const PLANT_RESPAWN_DELAY = 3100;

// Built block decay delay
const BLOCK_DECAY_DELAY = 15000;

// World cell kinds
const CELL_EMPTY  = 0;
const CELL_PLANT  = 1;
const CELL_EATEN  = 2;
const CELL_WATER  = 3;
const CELL_MINE   = 4;
const CELL_WALL   = 5;

/**
@class World cell class
*/
function Cell(cellType, agent)
{
    // If the cell type is unspecified, make it empty
    if (cellType === undefined)
        cellType = CELL_EMPTY;

    // If the agent is undefined, make it null
    if (agent === undefined)
        agent = null;

    /**
    Cell type
    */
    this.type = cellType;

    /**
    Agent at this cell
    */
    this.agent = agent;
}

/**
@class Eaten plant class
*/
function EatenPlant(x, y, time)
{
    /**
    Plant position
    */
    this.x = x;
    this.y = y;

    /**
    Time at which to respawn
    */
    this.respawnTime = time;

    assert (
        isNonNegInt(this.x) && isNonNegInt(this.y),
        'invalid plant coordinates'
    );

    assert (
        isNonNegInt(this.respawnTime),
        'invalid plant respawn time'
    );
}

/**
@class Built block class
*/
function BuiltBlock(x, y, time)
{
    /**
    Plant position
    */
    this.x = x;
    this.y = y;

    /**
    Time at which to disappear
    */
    this.decayTime = time;

    assert (
        isNonNegInt(this.x) && isNonNegInt(this.y),
        'invalid plant coordinates'
    );

    assert (
        isNonNegInt(this.decayTime),
        'invalid block decay time'
    );
}

/**
@class Represent a simulated world and its contents
*/
function World()
{
    /**
    World grid width
    */
    this.gridWidth = 0;

    /**
    World grid height
    */
    this.gridHeight = 0;

    /**
    Plants respawning flag
    */
    this.plantsRespawn = true;

    /**
    Fast update mode flag
    */
    this.fastMode = false;

    /**
    Total iteration count
    */
    this.itrCount = 0;

    /**
    Last reset iteration
    */
    this.lastResetIt = 0;

    /**
    World grid
    */
    this.grid = [];

    /**
    Population
    */
    this.population = [];

    /**
    Total number of plant cells
    */
    this.numPlants = 0;

    /**
    Plants currently available to eat
    */
    this.availPlants = 0;

    /**
    List of eaten plants
    */
    this.eatenPlants = [];

    /**
    Total plants eaten count
    */
    this.eatenPlantCount = 0;

    /**
    List of built blocks
    */
    this.builtBlocks = [];

    /**
    Cache of sprites last used during rendering
    */
    this.spriteCache = [];

    /**
    Number of images left to be loaded
    */
    this.imgsToLoad = 0;

    var that = this;
    function loadImage(fileName)
    {
        that.imgsToLoad++;

        var img = new Image();
        img.src = fileName;

        img.onload = function () { that.imgsToLoad--; }

        return img;      
    }

	// Load the sprite images	
	this.emptySprite    = loadImage("images/sprites/grass2.png");
	this.waterSprite    = loadImage("images/sprites/water.png");
	this.water2Sprite   = loadImage("images/sprites/water2.png");
	this.wallSprite     = loadImage("images/sprites/rock.png");
	this.plantSprite    = loadImage("images/sprites/moss_green.png");
	this.eatenSprite    = loadImage("images/sprites/moss_dark.png");
	this.mineSprite     = loadImage("images/sprites/landmine.png");
	this.antUSprite     = loadImage("images/sprites/ant_up.png");
	this.antDSprite     = loadImage("images/sprites/ant_down.png");
	this.antLSprite     = loadImage("images/sprites/ant_left.png");
	this.antRSprite     = loadImage("images/sprites/ant_right.png");
}

/**
Generate a random world
*/
World.prototype.generate = function (
    width,
    height,
    plantsRespawn,
    waterSeedProb,
    plantSeedProb,
    mineProb,
    rowWallsMean,
    rowWallsVar,
    colWallsMean,
    colWallsVar  
)
{
    // Set the default generation parameters
    if (plantsRespawn === undefined)
        plantsRespawn = false;
    if (waterSeedProb === undefined)
        waterSeedProb = 0.0012;
    if (plantSeedProb === undefined)
        plantSeedProb = 0.004;
    if (mineProb === undefined)
        mineProb = 0;
    if (rowWallsMean === undefined)
        rowWallsMean = 0;
    if (rowWallsVar === undefined)
        rowWallsVar = 0;
    if (colWallsMean === undefined)
        colWallsMean = 0;
    if (colWallsVar === undefined)
        colWallsVar = 0;

	// Ensure that the parameters are valid
	assert (width > 0 && height > 0);

	// Store the grid width and height
	this.gridWidth  = width;
	this.gridHeight = height;

    // Create a new world grid and fill it with empty cells
    this.grid = new Array(width * height);
    for (var i = 0; i < this.grid.length; ++i)
        this.grid[i] = new Cell();

	// Store the plant respawning flag
	this.plantsRespawn = plantsRespawn;

	// Clear the list of eaten plants	
	this.eatenPlants = [];
	
	// Reset all counters
	this.reset();
	
	//*******************************
	// Water generation
	//*******************************
	
	// For each row of cells
	for (var y = 0; y < height; ++y)
	{
		// For each column
		for (var x = 0; x < width; ++x)
		{
			// With a given probability
			if (randomFloat(0, 1) < waterSeedProb)
			{
				// Make this a water cell
				this.setCell(x, y, new Cell(CELL_WATER));
			}
		}
	}
	
	// For each pond generation pass
	for (var i = 0; i < 23; ++i)
	{
		// For each row of cells
		for (var y = 1; y < this.gridHeight - 1; ++y)
		{
			// For each column
			for (var x = 1; x < this.gridWidth - 1; ++x)
			{
				// Count the number of water neighbors
				var numWater = this.countNeighbors(x, y, CELL_WATER);
				
				// With a certain probability
				if (randomFloat(0, 1) < 0.02 * numWater + (numWater? 1:0) * 0.004 * Math.exp(numWater))
				{
					// Make this a water cell
					this.setCell(x, y, new Cell(CELL_WATER));
				}				
			}
		}
	}
	
	//*******************************
	// Wall generation
	//*******************************
	
	// Choose a random number of row walls
	var numRowWalls = Math.round(randomNorm(rowWallsMean, rowWallsVar));

	// Create a map for the row walls
	var rowWallMap = new Array(this.gridHeight);
	
	// For each row wall to generate
	for (var wallCount = 0; wallCount < numRowWalls;)
	{
		// Choose a random row
		var y = randomInt(2, this.gridHeight - 3);
		
		// If another wall would be immediately adjacent, skip it
		if (rowWallMap[y - 1] === true || rowWallMap[y + 1] === true)
			continue;
		
		// compute the two endpoints
		var x1 = randomInt(1, this.gridWidth - 2);
		var x2 = randomInt(1, this.gridWidth - 2);
	
		// compute the length
		var len = Math.abs(x1 - x2);
	
		// If the wall is too short or too long, skip it
		if (len < 5 || len > this.gridWidth / 4)
			continue;
	
		// For each column
		for (var x = x1; x != x2 && x > 0 && x < this.gridWidth - 1; x += ((x2 - x1) > 0? 1:-1))
		{
			// If this cell is water, skip it
			if (this.cellIsType(x, y, CELL_WATER) === true)
				break;
			
			// Make this cell a wall
			this.setCell(x, y, new Cell(CELL_WALL));
		}
		
		// Increment the wall count
		++wallCount;
		
		// update the row wall map
		rowWallMap[y] = true;
	}
	
	// Choose a random number of column walls
	var numColWalls = Math.round(randomNorm(colWallsMean, colWallsVar));

	// Create a map for the column walls
	var colWallMap = new Array(this.gridWidth);
	
	// For each row wall to generate
	for (var wallCount = 0; wallCount < numColWalls;)
	{
		// Choose a random column
		var x = randomInt(2, this.gridWidth - 3);
		
		// If another wall would be immediately adjacent, skip it
		if (colWallMap[x - 1] === true || colWallMap[x + 1] === true)
			continue;
		
		// compute the two endpoints
		var y1 = randomInt(1, this.gridHeight - 2);
		var y2 = randomInt(1, this.gridHeight - 2);
	
		// compute the length
		var len = Math.abs(y1 - y2);
	
		// If the wall is too short or too long, skip it
		if (len < 5 || len > this.gridHeight / 4)
			continue;
	
		// For each row
		for (var y = y1; y != y2 && y > 0 && y < this.gridHeight; y += ((y2 - y1) > 0? 1:-1))
		{
			// If this cell is water or any neighbor is a wall cell, skip it
			if (this.cellIsType(x, y, CELL_WATER) === true|| 
                this.countNeighbors(x, y, CELL_WALL) > 1)
				break;
			
			// Make this cell a wall
			this.setCell(x, y, new Cell(CELL_WALL));
		}
		
		// Increment the wall count
		++wallCount;
		
		// update the column wall map
		colWallMap[x] = true;
	}

	//*******************************
	// Food generation
	//*******************************
			
	// For each plant generation pass
	for (var i = 0; i < 11; ++i)
	{
		// For each row of cells
		for (var y = 1; y < this.gridHeight - 1; ++y)
		{	
			// For each column
			for (var x = 1; x < this.gridWidth - 1; ++x)
			{
				// If this cell is not empty, skip it
				if (this.cellIsType(x, y, CELL_EMPTY) === false)
					continue;
			
				// Count the number of water neighbors
				var numWater = this.countNeighbors(x, y, CELL_WATER);

				// If there are any water neighbors, continue
				if (numWater > 0)
					continue;
			
				// Count the number of plant neighbors
				var numPlant = this.countNeighbors(x, y, CELL_PLANT);			
												
				// With a certain probability, if there are no plant neighbors
				if (randomFloat(0, 1) < plantSeedProb && numPlant === 0)
				{
					// Make this a plant cell
					this.setCell(x, y, new Cell(CELL_PLANT));
				}
				
				// Otherwise, if there are plant neighbors
				else if (randomFloat(0, 1) < 0.04 * numPlant)
				{
					// Make this a plant cell with the same color as the neighbors
					this.setCell(x, y, new Cell(CELL_PLANT));
				}
			}
		}
	}

    // Count the number of plants in the world    
    this.numPlants = 0;
	for (var i = 0; i < this.grid.length; ++i)
	{
		if (this.grid[i].type === CELL_PLANT)
			this.numPlants++;
	}

    // Initialize the number of available plants
    this.availPlants = this.numPlants;

	//*******************************
	// Border wall generation
	//*******************************
	
	// For each column
	for (var x = 0; x < this.gridWidth; ++x)
	{
		// Make the top border a wall
		this.setCell(x, 0, new Cell(CELL_WALL));
		
		// Make the bottom border a wall
		this.setCell(x, this.gridHeight - 1, new Cell(CELL_WALL));
	}
	
	// For each row
	for (var y = 0; y < this.gridHeight; ++y)
	{
		// Make the left border a wall
		this.setCell(0, y, new Cell(CELL_WALL));
		
		// Make the right border a wall
		this.setCell(this.gridWidth - 1, y, new Cell(CELL_WALL));
	}
}

/**
Reset the world to its post-creation state
*/
World.prototype.reset = function ()
{
	// Store the iteration count
	this.lastResetIt = this.itrCount; 

	// Respawn all plants
	this.respawnPlants(true);
		
	// Remove all built blocks
	this.decayBlocks(true);

	// Clear the current population
	this.population = [];

	// Remove any ants from the world grid
    for (var i = 0; i < this.grid.length; ++i)
        this.grid[i].agent = null;

    for (var i = 0; i < this.grid.length; ++i)
    {
        assert (
            this.grid[i].agent === null,
            'non-null agent pointer after world reset'
        );
    }
}

/**
Respawn eaten plants
*/
World.prototype.respawnPlants = function (respawnAll)
{
    // By default, do not respawn all plants
    if (respawnAll === undefined)
        respawnAll = false;

    // Remaining eaten plants array
    var eatenPlants = [];

	// For each eaten plant
    for (var i = 0; i < this.eatenPlants.length; ++i)
	{
        var plant = this.eatenPlants[i];

		// If it is not time for this plant to be respawned, skip it
		if (plant.respawnTime > this.itrCount && !(respawnAll === true))
        {
            eatenPlants.push(plant);
            continue;
        }
			
		// Make the corresponding cell a new plant
		this.getCell(plant.x, plant.y).type = CELL_PLANT;
		
        // Increment the available plant count
        this.availPlants++;

        assert (
            this.availPlants <= this.numPlants,
            'invalid available plant count'
        );
	}

    // Update the eaten plants array
    this.eatenPlants = eatenPlants;
}

/**
Decay built blocks
*/
World.prototype.decayBlocks = function (decayAll)
{
    // By default, do not decay all blocks
    if (decayAll === undefined)
        decayAll = false;

    // Remaining built blocks array
    var builtBlocks = [];

	// For each eaten plant
    for (var i = 0; i < this.builtBlocks.length; ++i)
	{
        var block = this.builtBlocks[i];

		// If it is not time for this block to be removed, skip it
		if (block.decayTime > this.itrCount && !(decayAll === true))
        {
            builtBlocks.push(block);
            continue;
        }
			
		// Make the corresponding cell empty
		this.getCell(block.x, block.y).type = CELL_EMPTY;
	}

    // Update the built blocks array
    this.builtBlocks = builtBlocks;
}

/**
Update the world state
*/
World.prototype.update = function ()
{
	// If fast updating mode is enabled
	if (this.fastMode === true)
	{
		// Get the time at which we start this update
		var startTime = getTimeSecs();
		
		// Until the update time slice is elapsed
		while (getTimeSecs() < startTime + WORLD_UPDATE_TIME_SLICE)
		{
			// If all agents are dead, yield early
			if (this.population.length === 0)
			    return;	
			
			// Perform a small number of update iterations
			for (var i = 0; i < WORLD_UPDATE_ITR_COUNT; ++i)
				this.iterate();		
		}
	}
	else
	{
		// Iterate only once
		this.iterate();
	}
}

/**
Perform one world iteration
*/
World.prototype.iterate = function ()
{
	// For all agents in the population
    for (var i = 0; i < this.population.length; ++i)
	{
        var agent = this.population[i];

		// Update the agent state
		agent.update();
		
		// If the agent is no longer alive
		if (agent.isAlive() === false)
		{
			// Get the agent's position
			var pos = agent.position;
		
			// Nullify the agent pointer of its cell
			this.getCell(pos.x, pos.y).agent = null;
			
			// Remove the agent from the population
			this.population.splice(i, 1);

            // Move to the next agent in the population
            --i;
		}
	}

	// If eaten plants are to be respawned, place them back in the world
	if (this.plantsRespawn === true)
		this.respawnPlants(false);

    // Decay the built blocks
    this.decayBlocks(false);

	// Increment the iteration count
	this.itrCount++;
}

/**
Render the world
*/
World.prototype.render = function (canvas, canvasCtx, xPos, yPos, zoomLevel)
{
    assert (
        isNonNegInt(zoomLevel),
        'invalid zoom level'
    );

    // If there are images left to load
    if (this.imgsToLoad > 0)
    {
        clearCanvas(canvas, canvasCtx);
        canvasCtx.fillStyle = "White";
        canvasCtx.fillText("Loading sprites...", 10, 10);
        return;
    }

	// Ensure that the arguments are valids
	assert (
        xPos < this.gridWidth &&
        yPos < this.gridHeight &&
        zoomLevel >= WORLD_ZOOM_MIN &&
        zoomLevel <= WORLD_ZOOM_MAX
    );

	// Get the sprite size for this zoom level
	var spriteSize = WORLD_SPRITE_SIZES[zoomLevel - WORLD_ZOOM_MIN];
	
    // Compute the number of rows and columns of sprites to render
    var numRows = Math.ceil(canvas.height / spriteSize);
    var numCols = Math.ceil(canvas.width / spriteSize);

    // Compute the number of sprites to render
    var numSprites = numRows * numCols;

    // If the sprite cache size does not match, reset it
    if (this.spriteCache.length !== numSprites)
    {
        clearCanvas(canvas, canvasCtx);
        this.spriteCache = new Array(numSprites);
    }

    // Choose the animated water sprite
    var waterAnim = (this.itrCount % 4 <= 1);
    var waterSprite = waterAnim? this.waterSprite:this.water2Sprite;

	// Initialize the grid and frame y positions
	var gridY = yPos;
    var frameY = 0;

	// For each row
	for (var rowIdx = 0; rowIdx < numRows && gridY < this.gridHeight; ++rowIdx)
	{	
		// Reset the grid and framey position
		var gridX = xPos;
        var frameX = 0;
	
		// For each column
		for (var colIdx = 0; colIdx < numCols && gridX < this.gridWidth; ++colIdx)
		{
			// Get a reference to this cell
			var cell = this.getCell(gridX, gridY);
		
			// Declare a reference to the sprite to draw
			var sprite;
		
			// If this cell contains an ant
			if (cell.agent !== null)
			{
				// Switch on the ant direction
				switch (cell.agent.direction)
				{
					// Set the sprite according to the direction
					case AGENT_DIR_UP   : sprite = this.antUSprite; break;
					case AGENT_DIR_DOWN : sprite = this.antDSprite; break;
					case AGENT_DIR_LEFT : sprite = this.antLSprite; break;
					case AGENT_DIR_RIGHT: sprite = this.antRSprite; break;
					
					// Invalid agent direction
					default:
                    error('invalid agent direction (' + cell.agent.direction + ')');
				}
			}
			else
			{	
				// Switch on the cell types
				switch (cell.type)
				{
					// Empty cells
					case CELL_EMPTY: sprite = this.emptySprite; break;
					
					// Water cells
					case CELL_WATER: sprite = waterSprite; break;
					
					// Wall cells
					case CELL_WALL: sprite = this.wallSprite; break;
					
					// Alive and eaten plants
					case CELL_PLANT: sprite = this.plantSprite; break;
					case CELL_EATEN: sprite = this.eatenSprite; break;
					
					// Mine cell
					case CELL_MINE: sprite = this.mineSprite; break;
					
					// Invalid cell type
					default:
                    error('invalid cell type');
				}
			}

            /*
			assert (
                sprite instanceof Image,
                'invalid sprite'
            );

            assert (
                isNonNegInt(frameX) && isNonNegInt(frameY),
                'invalid frame coordinates'
            );

            assert (
                isPosInt(spriteSize),
                'invalid sprite size'
            );
            */

            // Get the cached sprite for this frame position
            var cachedSprite = this.spriteCache[numCols * rowIdx + colIdx];

            // If the sprite does not match the cached entry
            if (sprite !== cachedSprite)
            {
                // Draw the scaled sprite at the current frame position
                canvasCtx.drawImage(sprite, frameX, frameY, spriteSize, spriteSize);

                // Update the cached sprite
                this.spriteCache[numCols * rowIdx + colIdx] = sprite;
            }
					
			// Update the grid and frame position
            gridX += 1;
			frameX += spriteSize;
		}
		
		// Update the grid and frame position
        gridY += 1;
		frameY += spriteSize;
	}
}

/**
Place an agent at a specific location on the map
*/
World.prototype.placeAgent = function (agent, x, y)
{
	// Ensure that the arguments are valid
	assert (
        x < this.gridWidth && 
        y < this.gridHeight &&
        agent !== null,
        'invalid arguments to placeAgent'
    );
	
	// If this cell is not empty, placement failed
	if (this.cellIsType(x, y, CELL_EMPTY) === false || 
        this.getCell(x, y).agent !== null)
		return false;

	// Set the ant position
	agent.position = new Vector2(x, y);
		
	// Set the agent pointer for this cell
	this.getCell(x, y).agent = agent;

	// Add the ant to the population
	this.population.push(agent);

	// Placement successful
	return true;
}

/**
Place an agent on the map at random coordinates
*/
World.prototype.placeAgentRnd = function (agent)
{
    assert (
        agent !== null,
        'invalid parameters to placeAgentRnd'
    );

    // Get the initial population size
    var initPopSize = this.population.length;

	// Try to place the ant up to 512 times
	for (var i = 0; i < 512; ++i)
	{
		// Choose random coordinates in the world
	    var x = randomInt(0, this.gridWidth - 1);
		var y = randomInt(0, this.gridHeight - 1);

		// If the agent can be placed at these coordinates			
		if (this.placeAgent(agent, x, y) === true)
		{
            assert (
                this.population.length === initPopSize + 1,
                'agent not added to population'
            );

            assert (
                world.getCell(agent.position.x, agent.position.y).agent === agent,
                'agent pointer not valid after adding agent'
            );

			// Placement successful
			return true;
		}			
	}

    assert (
        this.population.length === initPopSize,
        'agent not added but population size changed'
    );
	
	// Placement failed
	return false;
}

/**
Place an agent on the map near some coordinates
*/
World.prototype.placeAgentNear = function (agent, x, y)
{
    assert (
        agent !== null,
        'invalid parameters to placeAgentNear'
    );

    // Get the initial population size
    var initPopSize = this.population.length;

	// Try to place the ant up to 512 times
	for (var i = 0; i < 512; ++i)
	{
		// Choose random coordinates in the world
	    var nearX = x + randomInt(-12, 12);
		var nearY = y + randomInt(-12, 12);

        // If the coordinates are outside of the map, try again
        if (nearX < 0 || 
            nearY < 0 ||
            nearX >= this.gridWidth || 
            nearY >= this.gridHeight)
            continue;

		// If the agent can be placed at these coordinates			
		if (this.placeAgent(agent, nearX, nearY) === true)
		{
            assert (
                this.population.length === initPopSize + 1,
                'agent not added to population'
            );

            assert (
                world.getCell(agent.position.x, agent.position.y).agent === agent,
                'agent pointer not valid after adding agent'
            );

			// Placement successful
			return true;
		}			
	}

    assert (
        this.population.length === initPopSize,
        'agent not added but population size changed'
    );
	
	// Placement failed
	return false;
}

/**
Move an ant to new coordinates
*/
World.prototype.moveAgent = function (agent, x, y)
{
	// Ensure that the parameters are valid
	assert (agent != null);
	
	// If this moves out of the map, deny the movement
	if (x > this.gridWidth || y > this.gridHeight)
		return false;

	// Get the ant position
	const pos = agent.position;
	
	// Ensure that the agent position is valid
	assert (
        pos.x >= 0 && pos.y >= 0 && 
        pos.x < this.gridWidth && pos.y < this.gridHeight,
        'invalid agent position'
    );
	
	// Obtain references to the concerned cells
	orig = this.getCell(pos.x, pos.y);
	dest = this.getCell(x, y);
	
	// Ensure that the ant pointer is valid
	assert (
        orig.agent === agent,
        'invalid agent pointer'
    );
	
	// If the destination cell is a wall or water, deny the movement
	if (dest.type === CELL_WALL || dest.type === CELL_WATER)
		return false;

	// If there is already an ant at the destination, deny the movement
	if (dest.agent !== null)
		return false;
	
	// Update the pointers to perform the movement
	orig.agent = null;
	dest.agent = agent;
	
	// Update the agent position
    agent.position = new Vector2(x, y);

	// Move successful
	return true;
}

/**
Eat a plant at the given coordinates
*/
World.prototype.eatPlant = function (x, y)
{
	// Ensure that the parameters are valid
	assert (x < this.gridWidth && y < this.gridHeight);
	
	// If this cell is not an available plant, stop
	if (this.cellIsType(x, y, CELL_PLANT) === false)
		return false;
	
	// Make this cell an eaten plant
	this.getCell(x, y).type = CELL_EATEN;

	// Add the plant to the list of eaten plants
    this.eatenPlants.push(new EatenPlant(x, y, this.itrCount + PLANT_RESPAWN_DELAY));
	
    // Decrement the available plant count
    this.availPlants--;

    // Increment the eaten plant count
    this.eatenPlantCount++;

	// Plant successfully eaten
	return true;
}

/**
Build a block at the given coordinates
*/
World.prototype.buildBlock = function (x, y)
{
	// Ensure that the parameters are valid
	assert (x < this.gridWidth && y < this.gridHeight);
	
	// If this cell is not empty, stop
	if (this.cellIsType(x, y, CELL_EMPTY) === false ||
        this.getCell(x,y).agent !== null)
		return false;
	
	// Make this cell a wall block
	this.getCell(x, y).type = CELL_WALL;

	// Add the block to the list of built blocks
    this.builtBlocks.push(new BuiltBlock(x, y, this.itrCount + BLOCK_DECAY_DELAY));

	// Plant successfully eaten
	return true;
}

/**
Test if a world cell is empty
*/
World.prototype.cellIsEmpty = function (x, y)
{
	// Perform the test
	return (this.getCell(x, y).type === CELL_EMPTY);
}

/**
Test the type of a cell
*/
World.prototype.cellIsType = function (x, y, type)
{
	// Perform the test
	return (this.getCell(x, y).type === type);
}

/**
Count cell neighbors of a given type
*/
World.prototype.countNeighbors = function (x, y, type)
{
	// Count the neighbor cells of the given type
    var count = 
		(this.cellIsType(x - 1, y - 1, type)? 1:0) +
		(this.cellIsType(x    , y - 1, type)? 1:0) +
		(this.cellIsType(x + 1, y - 1, type)? 1:0) +
		(this.cellIsType(x - 1, y    , type)? 1:0) +
		(this.cellIsType(x + 1, y    , type)? 1:0) +
		(this.cellIsType(x - 1, y + 1, type)? 1:0) +
		(this.cellIsType(x    , y + 1, type)? 1:0) +
		(this.cellIsType(x + 1, y + 1, type)? 1:0);	
	
	// Return the count
	return count;
}

/**
Set a given grid cell
*/
World.prototype.setCell = function (x, y, cell)
{
	// Ensure that the coordinates are valid
	assert (
        x >= 0 && y >= 0 &&
        x < this.gridWidth && y < this.gridHeight,
        'invalid coordinates in setCell'
    );
	
    // Ensure that the cell is valid
    assert (cell instanceof Cell);

	// Set the cell reference
	this.grid[y * this.gridWidth + x] = cell;
}

/**
Get a given grid cell
*/
World.prototype.getCell = function (x, y)
{
	// Ensure that the coordinates are valid
	assert (
        x >= 0 && y >= 0 &&
        x < this.gridWidth && y < this.gridHeight,
        'invalid coordinates in getCell'
    );
	
	// Return a reference to the cell
	return this.grid[y * this.gridWidth + x];
}

