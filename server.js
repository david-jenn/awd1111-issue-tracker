require('dotenv').config();

const config = require('config');
const debug = require('debug')('app:server');
const debugError = require('debug')('app:error');
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const dbModule = require('./database');
const { ObjectId } = require('mongodb');

// define custom objectId validator
const Joi = require('joi');
Joi.objectId = () => {
  return Joi.any().custom((value, helpers) => {
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
    message: {'any.objectId': '{#label} was not a valid ObjectId'}
  })
}

// create application
const app = express();
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());

//register routes
app.use('/api/user', require('./routes/api/user'));
app.use('/api/bug', require('./routes/api/bug'));
app.use('/api/comment', require('./routes/api/comment'));
app.use('/', express.static('public', {index: 'index.html'}));

// register error handlers
app.use((req, res, next) => {
  debugError(`sorry count't find ${req.originalURL}`);
  res.status(404)
     .type('text/plain')
     .send(`Sorry couldn't find ${req.originalUrl}`);
});
app.use((err, req, res, next) => {
  debugError(err);
  res.status(500).json( { error: err.message});
});

// listen for requests
const hostname = config.get('http.host');
const port = config.get('http.port');
app.listen(port, () => {
  debug(`Server running at http://${hostname}:${port}`);
});
