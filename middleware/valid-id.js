const { ObjectId } = require('mongodb');
const { RequestHandler } = require('express');

/**
 * Validates an ObjectId that is part of the path
 * and adds the validated ObjectId to the request.
 * 
 * Calls the next middleware if ObjectId is valid.
 * Sends a 404 response if the ObjectId is invalid.
 * 
 * @param {string} paramName the name of the path parameter
 * @returns {RequestHandler} a middleware
 */

//factory function is a function that creates another function
const validId = (paramName) => {
  return (req, res, next) => {
    const idString = req.params[paramName];
    try {
      req[paramName] = new ObjectId(idString);
      return next();
    } catch (err) {
      return res.status(404).json({ error: `${paramName} "${idString}" is not a valid ObjectId.` });
    }
  };
}

module.exports = validId;