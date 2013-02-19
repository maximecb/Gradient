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
// 2D Vectors
//============================================================================

/**
@class 2D vector
*/
function Vector2(x, y)
{
    this.x = x;
    this.y = y;
}

/**
Add two vectors
*/
Vector2.add = function (v1, v2)
{
    return new Vector2(v1.x + v2.x, v1.y + v2.y);
}

/**
Multiply a vector by a scalar
*/
Vector2.scalarMul = function (v, s)
{
    return new Vector2(v.x * s, v.y * s);
}

