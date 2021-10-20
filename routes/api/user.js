const config = require('config');
const debug = require('debug')('app:route:user');
const express = require('express');
const moment = require('moment');
const _ = require('lodash');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
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

    if (!req.auth) {
      return res.status(401).json({ error: 'You must be logged in' });
    }

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

    if (!req.auth) {
      return res.status(401).json({ error: 'You must be logged in' });
    }
    
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
    user.createdOn = new Date();
    
    

    //hash password
    const saltRounds = parseInt(config.get('auth.saltRounds'));
    user.password = await bcrypt.hash(user.password, saltRounds);

    const emailExists = await dbModule.findUserByEmail(user.email);
    debug(emailExists);
    if (emailExists) {
      res.status(400).json({
        error: `Email ${user.email} already registered`,
      });
    } else {

      const edit = {
        timestamp: new Date(),
        operation: 'insert',
        col: 'user',
        target: { userId: user._id },
        update: user,
        auth: req.auth,
      };

      await dbModule.insertOneUser(user);
      await dbModule.saveEdit(edit);

      const authPayload = {
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      };

      const authSecret = config.get('auth.secret');
      const authOptions = { expiresIn: config.get('auth.tokenExpiresIn') };
      const authToken = jwt.sign(authPayload, authSecret, authOptions);

      const cookieOptions = { httpOnly: true, maxAge: parseInt(config.get('auth.cookieMaxAge')) };
      res.cookie('authToken', authToken, cookieOptions);

      res.status(200).json({
        success: 'New User Registered',
        userId: user._id,
        token: authToken,
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
    debug(user);

    if (user && (await bcrypt.compare(password, user.password))) {
      //issue token
      const authPayload = {
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      };

      const authSecret = config.get('auth.secret');
      const authOptions = { expiresIn: config.get('auth.tokenExpiresIn') };
      const authToken = jwt.sign(authPayload, authSecret, authOptions);

      const cookieOptions = { httpOnly: true, maxAge: parseInt(config.get('auth.cookieMaxAge')) };
      res.cookie('authToken', authToken, cookieOptions);

      res.json({ message: 'Welcome back', userId: user._id, token: authToken });
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
    if (!req.auth) {
      return res.status(400).json({ error: 'You must be logged in' });
    }

    const userId = req.userId;
    const update = req.body;

    if (update.password) {
      const saltRounds = parseInt(config.get('auth.saltRounds'));
      update.password = await bcrypt.hash(update.password, saltRounds);
    }

    if (Object.keys(update).length > 0) {
      update.lastUpdatedOn = new Date();
      update.lastUpdatedBy = {
        _id: req.auth._id,
        email: req.auth.email,
        fullName: req.auth.fullName,
        role: req.auth.role,
      }
    }

    const user = await dbModule.findUserById(userId);

    if (!user) {
      res.status(404).json({
        Error: `User ${userId} not found`,
      });
    } else {

      const edit = {
        timestamp: new Date(),
        operation: 'update',
        col: 'user',
        target: { userId },
        update,
        auth: req.auth,
      };

      await dbModule.updateOneUser(userId, update);
      await dbModule.saveEdit(edit);
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

    if (!req.auth) {
      return res.status(400).json({ error: 'You must be logged in' });
    }

    const userId = req.userId;
    const user = await dbModule.findUserById(userId);
    if (!user) {
      res.status(404).json({
        Error: `User ${userId} not found`,
      });
    } else {

      const edit = {
        timestamp: new Date(),
        operation: 'delete',
        col: 'user',
        target: { userId },
        auth: req.auth,
      };
      await dbModule.saveEdit(edit);
      await dbModule.deleteOneUser(userId);
      res.status(200).json({
        message: `User ${userId} deleted`,
      });
    }
  })
);

//export router
module.exports = router;
