// This is not a middleware function.
// This is a higher-order function, used to wrap async middleware.

const { RequestHandler } = require('express');

/**
 * Wraps an async middleware in a try-catch block.
 * @param {RequestHandler} middleware
 * @returns {RequestHandler} wrapped middleware
 */
function asyncCatch(middleware) {
  return (req, res, next) => Promise.resolve(middleware(req, res, next)).catch(next);
}

module.exports = asyncCatch;