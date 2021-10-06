const debug = require('debug')('app:route:user');
const express = require('express');
const moment = require('moment');
const _ = require('lodash');
const dbModule = require('../../database');
const { newId } = require('../../database');

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
    const users = await dbModule.findAllUsers();
    debug(users);
    res.json(users);
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
        error: 'Email is already registered',
      });
    } else {
      await dbModule.insertOneUser(user);
      res.status(200).json({
        Success: 'New User Registered!',
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
        message: 'Welcome Back',
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
