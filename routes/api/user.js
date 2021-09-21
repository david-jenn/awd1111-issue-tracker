const debug = require('dubug')('app:route:user');
const express = require('express');
const moment = require('moment');
const _ = require('lodash');
const { nanoid } = require('nanoid');

const usersArray = [];

//create router 
const router = express.Router();

// register routes
router.get('/list', (req, res, next) => {
  res.json(userArray);
});
router.get('/userId', (req, res, next) => {
  const userId = req.params.userId;
  //fixme
});
router.post('/register', (req, res, next) => {
  //fixme
});
router.post('/login', (req, res, next) => {
  //fixme
});
router.put('/:userId', (req, res, next) => {
  //fixme
});
router.delete('/:userId', (req, res, next) => {
  //fixme
});

//export router
module.exports = router;