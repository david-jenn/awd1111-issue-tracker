const config = require('config');
const jwt = require('jsonwebtoken');

const auth = () => {
  return (req, res, next) => {
    try {
      const authCookie = req.cookies.authToken;
      if (authCookie) {
        const authSecret = config.get('auth.secret');
        const authPayload = jwt.verify(authCookie, authSecret);
        req.auth = authPayload;
      }
    } catch (err) {}
    next();
  };
};

module.exports = auth;
