const debug = require('dubug')('app:route:user');
const express = require('express');
const moment = require('moment');
const _ = require('lodash');
const { nanoid } = require('nanoid');

//fix me put data in
const bugsArray = [];

//create router 
const router = express.Router();

// register routes
router.get('/list', (req, res, next) => {
  res.json(bugsArray);
});
router.get('/:bugId', (req, res, next) => {
  res.json(bugsArray);
});
router.get('/:bugId', (req, res, next) => {
  const bugId = req.params.bugId;
  //fixme get bug from bugs array and send json response
});
router.put('/new', (req, res, next) => {
  //fixme create new bug 
});
router.put('/:bugId', (req, res, next) => {
  //fixme: update existing bug and send json response
});
router.put('/:bugId/classify', (req, res, next) => {
  //fixme classify bug and send response as json
});
router.put('/:bugId/assign', (req, res, next) => {
  //fixme: assign bug to a user
});
router.put('/:bugId/close', (req, res, next) => {
  //fixme close bug and json response
});

module.exports = router;