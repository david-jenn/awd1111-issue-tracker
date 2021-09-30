const config = require('config');
require('dotenv').config();

const debug = require('debug')('app:server');
const debugError = require('debug')('app:error');
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const dbModule = require('./database');

// create application
const app = express();
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());

//register routes
app.get('/', (req, res, next) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
})

app.use('/api/user', require('./routes/api/user'));
app.use('/api/bug', require('./routes/api/bug'));
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

//take in public files
app.use('/', express.static('public'));

// listen for requests
const hostname = config.get('http.host');
const port = config.get('http.port');
app.listen(port, () => {
  debug(`Server running at http://${hostname}:${port}`);
});
