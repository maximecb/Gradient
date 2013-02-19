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
// Page interface code
//============================================================================

// GUI redrawing delay
const GUI_REDRAW_DELAY = 0.2;

// Speed count interval
const SPEED_COUNT_INTERV = 3;

// Movement controls
const CTRL_UP = 0;
const CTRL_DOWN = 1;
const CTRL_LEFT = 2;
const CTRL_RIGHT = 3;

/**
Called after page load to initialize needed resources
*/
function init()
{
    // Find the debug and stats text elements
    debugTextElem = findElementById("debug_text");
    statsTextElem = findElementById("stats_text");

    // Find the control button elements
    zoomInButton = findElementById("zoom_in_button");
    zoomOutButton = findElementById("zoom_out_button");
    realTimeButton = findElementById("real_time_button");
    fastModeButton = findElementById("fast_mode_button");

    // Get a reference to the canvas
    canvas = document.getElementById("canvas");

    // Set the canvas size
    canvas.width = 512;
    canvas.height = 512;

    // Get a 2D context for the drawing canvas
    canvasCtx = canvas.getContext("2d");

    // Clear the canvas
    clearCanvas(canvas, canvasCtx);

    // Create the genetic algorithm instance
    genAlg = new GenAlg(AntAgent);

    // Create the world instance
    world = new World();

    // Generate the world map
    world.generate(
        128,        // Width
        128,        // Height
        true,       // Plants respawn flag
        undefined,
        undefined,
        undefined,
        10,         // Row walls mean
        1,          // Row walls var
        10,         // Col walls mean
        1           // Col walls var
    );

    // Initialize the camera coordinates
    xCoord = 0;
    yCoord = 0;

    // Initialize the zoom level
    zoomLevel = WORLD_ZOOM_MAX - 4;

    // Movement control states
    controls = [];

	// Last redrawing time
	lastRedraw = 0;

    // Set the update function to be called regularly
    this.updateInterv = setInterval(
        update,
        WORLD_UPDATE_TIME_SLICE * 1000
    );

    // Initialize the button states
    zoomInButton.disabled = (zoomLevel >= WORLD_ZOOM_MAX);
    zoomOutButton.disabled = (zoomLevel <= WORLD_ZOOM_MIN);
    realTimeButton.disabled = (world.fastMode === false);
    fastModeButton.disabled = (world.fastMode === true);

    // Store the starting time in seconds
    startTimeSecs = getTimeSecs();

    // Initialize the speed count parameters
    speedCountStartTime = getTimeSecs();
    speedCountStartItrs = 0;
    itrsPerSec = 0;

}
window.addEventListener("load", init, false);

/**
Key press handler
*/
function keyDown(event)
{
    switch (event.keyCode)
    {
        case 37: controls[CTRL_LEFT]    = true; break;
        case 38: controls[CTRL_UP]      = true; break;
        case 39: controls[CTRL_RIGHT]   = true; break;
        case 40: controls[CTRL_DOWN]    = true; break;
    }

    // Prevent the default key behavior (window movement)
    event.preventDefault();
}
window.addEventListener("keydown", keyDown, false);

/**
Key release handler
*/
function keyUp(event)
{
    switch (event.keyCode)
    {
        case 37: controls[CTRL_LEFT]    = false; break;
        case 38: controls[CTRL_UP]      = false; break;
        case 39: controls[CTRL_RIGHT]   = false; break;
        case 40: controls[CTRL_DOWN]    = false; break;
    }

    // Prevent the default key behavior (window movement)
    event.preventDefault();
}
window.addEventListener("keyup", keyUp, false);

/**
Find an element in the HTML document by its id
*/
function findElementById(id, elem)
{
    if (elem === undefined)
        elem = document

    for (k in elem.childNodes)
    {
        var child = elem.childNodes[k];

        if (child.attributes)
        {
            var childId = child.getAttribute('id');

            if (childId == id)
                return child;
        }

        var nestedElem = findElementById(id, child);

        if (nestedElem)
            return nestedElem;
    }

    return null;
}

/**
Print text to the page, for debugging purposes
*/
function dprintln(text)
{
    debugTextElem.innerHTML += escapeHTML(text + '\n');
}

/**
Set the text in the stats box
*/
function printStats(text)
{
    statsTextElem.innerHTML = escapeHTML(text);
}

/**
Clear a canvas
*/
function clearCanvas(canvas, canvasCtx)
{
    canvasCtx.fillStyle = "#111111";
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
}

/**
Update the state of the system
*/
function update()
{
    // Update the camera movement
    if (controls[CTRL_LEFT])
        moveLeft();
    if (controls[CTRL_RIGHT])
        moveRight();
    if (controls[CTRL_UP])
        moveUp();
    if (controls[CTRL_DOWN])
        moveDown();

    // If running in fast mode, update the world at every update
    if (world.fastMode === true)
    {
        genAlg.update();
	    world.update();
    }

	// If the GUI needs to be redrawn
	if (getTimeSecs() > lastRedraw + GUI_REDRAW_DELAY)
	{
        // If running in real-time, update only before rendering
        if (world.fastMode === false)
        {
            genAlg.update();
	        world.update();
        }

        // Render the world
    	world.render(canvas, canvasCtx, xCoord, yCoord, zoomLevel);

        // Compute the time spent running
        var timeRunningSecs = Math.round(getTimeSecs() - startTimeSecs);

        // Compute the percentage of plants still available
        var plantPercent = (100 * world.availPlants / world.numPlants).toFixed(1);

        // Print some statistics
        printStats(
            'time running: ' + timeRunningSecs + 's\n' +
            'iterations/s: ' + itrsPerSec + '\n' +
            '\n' +
            'ind. count  : ' + genAlg.indCount + '\n' +
            'seed inds.  : ' + genAlg.seedCount + '\n' +
            'itr. count  : ' + world.itrCount + '\n' +
            'eaten plants: ' + world.eatenPlantCount + '\n' +
            '\n' +
            'live agents  : ' + world.population.length + '\n' +
            'avail. plants: ' + plantPercent + '%\n' +
            //'built blocks : ' + world.builtBlocks.length + '\n' +
            '\n' +
            'zoom level: ' + zoomLevel + '\n' +
            'camera x  : ' + xCoord + '\n' +
            'camera y  : ' + yCoord
        );

    	// Update the last redraw time
    	lastRedraw = getTimeSecs();
    }

    // If the speed count is to be update
    if (getTimeSecs() > speedCountStartTime + SPEED_COUNT_INTERV)
    {
        // Recompute the update rate
        var itrCount = world.itrCount - speedCountStartItrs;
        itrsPerSec = Math.round(itrCount / SPEED_COUNT_INTERV);
        speedCountStartItrs = world.itrCount;
        speedCountStartTime = getTimeSecs();
    }
}

/**
Augment the zoom level
*/
function zoomIn()
{
	// Increment the zoom level if possible
	if (zoomLevel < WORLD_ZOOM_MAX)
		++zoomLevel;

    // Enable the zoom out button
    zoomOutButton.disabled = false;

    // If zooming in is no longer possible, disable the button
    if (zoomLevel >= WORLD_ZOOM_MAX)
        zoomInButton.disabled = true;
}

/**
Reduce the zoom level
*/
function zoomOut()
{
	// If we are at the minimum zoom level, stop
	if (zoomLevel === WORLD_ZOOM_MIN)
		return;
	
	// Decrement the zoom level
	--zoomLevel;

    // Enable the zoom in button
    zoomInButton.disabled = false;

    // If zooming out is no longer possible, disable the button
    if (zoomLevel === WORLD_ZOOM_MIN)
        zoomOutButton.disabled = true;
	
	// Obtain the sprite size for this zoom level
	var spriteSize = WORLD_SPRITE_SIZES[zoomLevel];
		
	// Compute the coordinates at the corner of the map
	var cornerX = world.gridWidth - canvas.width  / spriteSize;
	var cornerY = world.gridHeight - canvas.height / spriteSize;
		
	// Update the camera coordinates
	xCoord = Math.max(0, Math.min(xCoord, cornerX));
	yCoord = Math.max(0, Math.min(yCoord, cornerY));
}

/**
Augment the world update rate
*/
function goFaster()
{	
    world.fastMode = true;

    realTimeButton.disabled = false;
    fastModeButton.disabled = true;
}

/**
Reduce the world update rate
*/
function goSlower()
{
    world.fastMode = false;

    realTimeButton.disabled = true;
    fastModeButton.disabled = false;
}

/**
Move the camera left
*/
function moveLeft()
{
    // compute the movement delta
    var delta = WORLD_ZOOM_MAX - (zoomLevel - WORLD_ZOOM_MIN) + 1;

    // compute the updated coordinates
    var newXCoord = xCoord - delta;

    // Update the coordinates
    xCoord = Math.max(0, newXCoord);
}

/**
Move the camera right
*/
function moveRight()
{
    // compute the movement delta
    var delta = WORLD_ZOOM_MAX - (zoomLevel - WORLD_ZOOM_MIN) + 1;

    // compute the updated coordinates
    var newXCoord = xCoord + delta;

    // Obtain the sprite size for this zoom level
    var spriteSize = WORLD_SPRITE_SIZES[zoomLevel];

    // Compute the coordinates at the corner of the map
    var cornerX = Math.max(world.gridWidth - canvas.width / spriteSize, 0);

    // Update the coordinates
    xCoord = Math.min(newXCoord, cornerX);
}

/**
Move the camera up
*/
function moveUp()
{
    // compute the movement delta
    var delta = WORLD_ZOOM_MAX - (zoomLevel - WORLD_ZOOM_MIN) + 1;

    // compute the updated coordinates
    var newYCoord = yCoord - delta;

    // Update the coordinates
    yCoord = Math.max(0, newYCoord);
}

/**
Move the camera down
*/
function moveDown()
{
    // compute the movement delta
    var delta = WORLD_ZOOM_MAX - (zoomLevel - WORLD_ZOOM_MIN) + 1;

    // compute the updated coordinates
    var newYCoord = yCoord + delta;

    // Obtain the sprite size for this zoom level
    var spriteSize = WORLD_SPRITE_SIZES[zoomLevel];

    // Compute the coordinates at the corner of the map
    var cornerY = Math.max(world.gridHeight - canvas.height / spriteSize, 0);

    // Update the coordinates
    yCoord = Math.min(newYCoord, cornerY);
}

