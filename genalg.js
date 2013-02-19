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
// Genetic Algorithm Implementation
//============================================================================

/**
Constructor for agent evolution GA
*/
function GenAlg(agentClass)
{
	/**
    Agent class function
    */
    this.agentClass = agentClass;

    /**
    Population vector
    */
    this.population = [];

    /**
    Minimum population size
    */
    this.minPopSize = 25;

    /**
    Mutation probability, for asexual reproduction.
    */
    this.mutProb = 0.02;
	
	/**
    Produced individual count
    */
    this.indCount = 0;

    /**
    Seed individual count
    */
    this.seedCount = 0;
}

/**
Update the state of the GA
*/
GenAlg.prototype.update = function ()
{
    // Count of live agents
    var liveCount = 0;

    // For each individual in the population
    for (var i = 0; i < this.population.length; ++i)
    {
        var agent = this.population[i];        

        // If the agent is alive
        if (agent.isAlive())
        {
            // Increment the live agent count
            liveCount++;
        }
        else
        {
            // Remove the agent from the population
            this.population.splice(i, 1);
            --i;
        }
    }

    // While the population size is below the minimum
    while (liveCount < this.minPopSize)
    {
        // Create a new agent
        var agent = this.newIndividual();

        // Add the agent to the population
        this.population.push(agent);

        // Place the agent at random coordinates
        world.placeAgentRnd(agent);

        // Increment the live count
        liveCount++;

        // Increment the seed individuals count
        this.seedCount++;
    }
}

/**
Create a new individual
*/
GenAlg.prototype.newIndividual = function ()
{
	// Create a new agent
    var newAgent = this.agentClass.newAgent();
	
	// Increment the count of individuals created
	++this.indCount;
	
	// Return the new agent
	return newAgent;
}

/**
Mutate an individual
*/
GenAlg.prototype.mutate = function (agent)
{
	// Mutate the agent
	var newAgent = this.agentClass.mutate(agent, this.mutProb);
	
	// Increment the count of individuals created
	++this.indCount;
	
	// Return a pointer to the new agent
	return newAgent;
}

/**
Create offspring for an agent
*/
GenAlg.prototype.makeOffspring = function (agent)
{
    // Create a new agent through mutation
    var newAgent = this.mutate(agent);

    // Add the new agent to the population
    this.population.push(newAgent);

    // Place the new agent in the world near the parent
    world.placeAgentNear(newAgent, agent.position.x, agent.position.y);
}

