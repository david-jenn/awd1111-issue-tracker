const Joi = require('joi');
const { RequestHandler } = require('express');
const debug = require('debug')('app:middleware:valid-body')
/**
 * Uses Joi to validate the request body against a schema.
 *
 * Calls the next middleware if body is valid.
 * Sends a 400 response if the body is invalid.
 *
 * @param {Joi.ObjectSchema} schema
 * @returns {RequestHandler} a middleware
 */
const validBody = (schema) => {
  return (req, res, next) => {
    debug(req.body);
    const validateResult = schema.validate(req.body, { abortEarly: false });
    if (validateResult.error) {
      return res.status(400).json({ error: validateResult.error });
    } else {
      req.body = validateResult.value;
      return next();
    }
  };
};

module.exports = validBody;
