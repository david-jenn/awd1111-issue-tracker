const debug = require('debug')('app:route:user');
const express = require('express');
const moment = require('moment');
const _ = require('lodash');
const dbModule = require('../../database');
const { newId, connect } = require('../../database');

const asyncCatch = require('../../middleware/async-catch');
const validId = require('../../middleware/valid-id');
const validBody = require('../../middleware/valid-body');

const Joi = require('joi');

//create schemas
const registerUserSchema = Joi.object({
  email: Joi.string().trim().min(3).email().required(),
  password: Joi.string().trim().min(8).required(),
  fullName: Joi.string().trim().min(2).required(),
  givenName: Joi.string().trim().min(1).required(),
  familyName: Joi.string().trim().min(1).required(),
  role: Joi.string().trim().valid('DEV', 'BA', 'QA', 'PM', 'TM').required(),
});
const loginUserSchema = Joi.object({
  email: Joi.string().trim().required(),
  password: Joi.string().trim().required(),
});
const updateUserSchema = Joi.object({
  password: Joi.string().trim().min(8),
  fullName: Joi.string().trim().min(2),
  givenName: Joi.string().trim().min(1),
  familyName: Joi.string().trim().min(1),
  role: Joi.string().trim().valid('DEV', 'BA', 'QA', 'PM', 'TM'),
});

//create router
const router = express.Router();

// register routes
router.get(
  '/list',
  asyncCatch(async (req, res, next) => {
    let { keywords, role, maxAge, minAge, sortBy, pageSize, pageNumber } = req.query;
    debug(req.query);
    minAge = parseInt(minAge);
    maxAge = parseInt(maxAge);

    const today = new Date();
    today.setHours(0);
    today.setMinutes(0);
    today.setSeconds(0);
    today.setMilliseconds(0);
    debug(today);
    const maxDate = new Date(today);
    const minDate = new Date(today);

    const match = {};

    if (keywords) {
      match.$text = { $search: keywords };
    }
    if (role) {
      match.role = { $eq: role };
    }
    if (maxAge && minAge) {
      maxDate.setDate(today.getDate() - maxAge);
      minDate.setDate(today.getDate() - minAge + 1);
      match.createdDate = { $gte: maxDate, $lt: minDate };
    } else if (maxAge) {
      maxDate.setDate(today.getDate() - maxAge);
      match.createdDate = { $gte: maxDate };
    } else if (minAge) {
      minDate.setDate(today.getDate() - minAge + 1);
      match.createdDate = { $lt: minDate };
    }

    let sort = { givenName: 1, familyName: 1, createdDate: 1 };
    switch (sortBy) {
      case 'givenName':
        sort = { givenName: 1, familyName: 1, createdDate: 1 };
        break;
      case 'familyName':
        sort = { familyName: 1, givenName: 1, createdDate: 1 };
        break;
      case 'role':
        sort = { role: 1, givenName: 1, familyName: 1, createdDate: 1 };
        break;
      case 'newest':
        sort = { createdDate: -1 };
        break;
      case 'oldest':
        sort = { createDate: 1 };
        break;
    }

    pageNumber = parseInt(pageNumber) || 1;
    pageSize = parseInt(pageSize) || 5;
    const skip = (pageNumber - 1) * pageSize;
    const limit = pageSize;

    const pipeline = [{ $match: match }, { $sort: sort }, { $skip: skip }, { $limit: limit }];
    debug(pipeline);

    const db = await connect();
    const cursor = db.collection('user').aggregate(pipeline);
    const results = await cursor.toArray();
    res.status(200).send(results);
  })
);
router.get(
  '/:userId',
  validId('userId'),
  asyncCatch(async (req, res, next) => {
    const userId = req.userId;
    const user = await dbModule.findUserById(userId);
    debug(user);
    if (!user) {
      res.status(404).json({
        error: `user ${userId} not found`,
      });
    } else {
      res.status(200).json(user);
    }
  })
);
router.post(
  '/register',
  validBody(registerUserSchema),
  asyncCatch(async (req, res, next) => {
    const user = req.body;
    user._id = newId();

    const emailExists = await dbModule.findUserByEmail(user.email);
    if (emailExists) {
      res.status(400).json({
        error: `Email ${user.email} already registered`,
      });
    } else {
      await dbModule.insertOneUser(user);
      res.status(200).json({
        Success: `New User ${userId} Registered`,
      });
    }
  })
);
router.post(
  '/login',
  validBody(loginUserSchema),
  asyncCatch(async (req, res, next) => {
    const { email, password } = req.body;

    const user = await dbModule.findUserByEmail(email);

    if (!user) {
      res.status(400).json({ error: 'Invalid Login Credentials' });
    } else if (user.password == password) {
      res.status(200).json({
        message: `Welcome Back ${userId}`,
      });
    } else {
      res.status(400).json({
        error: 'Invalid login credentials',
      });
    }
  })
);
router.put(
  '/:userId',
  validId('userId'),
  validBody(updateUserSchema),
  asyncCatch(async (req, res, next) => {
    const userId = req.userId;
    const update = req.body;

    const user = await dbModule.findUserById(userId);

    if (!user) {
      res.status(404).json({
        Error: `User ${userId} not found`,
      });
    } else {
      await dbModule.updateOneUser(userId, update);
      res.status(200).json({
        message: `user ${userId} updated`,
      });
    }
  })
);
router.delete(
  '/:userId',
  validId('userId'),
  asyncCatch(async (req, res, next) => {
    const userId = req.uerId;
    const user = await dbModule.findUserById(userId);
    if (!user) {
      res.status(404).json({
        Error: `User ${userId} not found`,
      });
    } else {
      await dbModule.deleteOneUser(userId);
      res.status(200).json({
        message: `User ${userId} deleted`,
      });
    }
  })
);

//export router
module.exports = router;
