require('dotenv').config();

const config = require('config');
const debug = require('debug')('app:server');
const debugError = require('debug')('app:error');
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const dbModule = require('./database');
const { ObjectId } = require('mongodb');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');

if (!config.get('db.url')) {
  throw new Error('db.url not defined');
}
if (!config.get('auth.secret')) {
  throw new Error('auth.secret not defined');
}
if (!config.get('auth.tokenExpiresIn')) {
  throw new Error('auth.tokenExpiresIn not defined');
}
if (!config.get('auth.cookieMaxAge')) {
  throw new Error('auth.cookieMaxAge not defined');
}
if (!config.get('auth.saltRounds')) {
  throw new Error('auth.saltRounds not defined');
}

// define custom objectId validator
const Joi = require('joi');
Joi.objectId = () => {
  return Joi.any()
    .custom((value, helpers) => {
      try {
        if (!value) {
          return helpers.error('any.objectId');
        } else if (typeof value !== 'object' && typeof value !== 'string') {
          return helpers.error('any.objectId');
        } else {
          return new ObjectId(value);
        }
      } catch (err) {
        return helpers.error('any.objectId');
      }
    })
    .rule({
      message: { 'any.objectId': '{#label} was not a valid ObjectId' },
    });
};

// create application
const app = express();

if (config.get('env') === 'production') {
  app.use(helmet());
  app.use(compression());
}
if (config.get('morgan.enabled') === true || config.get('morgan.enabled') === 'true') {
  const morganFormat = config.get('morgan.format');
  app.use(morgan(morganFormat));
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('./middleware/auth')());

//register routes

//first part where you mount it, second part what your mounting
app.use('/api/user', require('./routes/api/user'));
app.use('/api/bug', require('./routes/api/bug'));
app.use('/api/bug', require('./routes/api/comment'));
app.use('/api/bug', require('./routes/api/test'));
app.use('/', express.static('public', { index: 'index.html' }));

// register error handlers
app.use((req, res, next) => {
  debugError(`sorry count't find ${req.originalURL}`);
  res.status(404).type('text/plain').send(`Sorry couldn't find ${req.originalUrl}`);
});
app.use((err, req, res, next) => {
  debugError(err);
  res.status(500).json({ error: err.message });
});

// listen for requests
const hostname = config.get('http.host');
const port = config.get('http.port');
app.listen(port, () => {
  debug(`Server running at http://${hostname}:${port}`);
});
