const config = require('config');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const debug = require('debug')('app:middleware:auth'); 

const authSecret = config.get('auth.secret');

function auth() {
  return (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const authCookie = req.cookies.authToken;

    if (authHeader) {
      const [authType, authToken] = authHeader.split(' ', 2);
      if (authType === 'Bearer' && authToken) {
        try {
          req.auth = jwt.verify(authToken, authSecret);
        } catch (err) {
          debug('invalid token:', authToken);
        }
      } else {
        debug('unsupported auth type:', authType);
      }
    } else if (authCookie) {
      try {
        req.auth = jwt.verify(authCookie, authSecret);
        const cookieOptions = {
          httpOnly: true,
          maxAge: parseInt(config.get('auth.cookieMaxAge')),
        };
        res.cookie('authToken', authCookie, cookieOptions);
        debug(authCookie);
      } catch (err) {
        debug('invalid token:', authCookie);
      }
    }
    return next();
  };
}

module.exports = auth;