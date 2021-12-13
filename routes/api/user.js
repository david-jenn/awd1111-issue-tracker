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
const isLoggedIn = require('../../middleware/isLoggedIn');
const hasPermissions = require('../../middleware/hasPermissions');

const Joi = require('joi');

//create schemas
const registerUserSchema = Joi.object({
  email: Joi.string().trim().min(3).email().required(),
  password: Joi.string().trim().min(8).required(),
  fullName: Joi.string().trim().min(2).required(),
  givenName: Joi.string().trim().min(1).required(),
  familyName: Joi.string().trim().min(1).required(),
});
const loginUserSchema = Joi.object({
  email: Joi.string().trim().required(),
  password: Joi.string().trim().required(),
});
const roleSchema = Joi.string().valid('DEV', 'BA', 'QA', 'PM', 'TM');

const updateUserSchema = Joi.object({
  password: Joi.string().trim().min(8),
  fullName: Joi.string().trim().min(2),
  givenName: Joi.string().trim().min(1),
  familyName: Joi.string().trim().min(1),
  role: Joi.alternatives().try(roleSchema, Joi.array().items(roleSchema)),
});

async function issueToken(user) {
  const authPayload = {
    _id: user._id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
  };

  const userRoles = Array.isArray(user.role) ? user.role : [user.role];
  const roles = await Promise.all(userRoles.map((roleName) => dbModule.findRoleByName(roleName)));

  // combine the permission tables
  const permissions = {};
  for (const role of roles) {
    if (role) {
      for (const permission in role.permissions) {
        if (role.permissions[permission]) {
          permissions[permission] = true;
        }
      }
    }
  }

  authPayload.permissions = permissions;
  debug(authPayload);

  const authSecret = config.get('auth.secret');
  const authOptions = { expiresIn: config.get('auth.tokenExpiresIn') };
  const authToken = jwt.sign(authPayload, authSecret, authOptions);
  return authToken;
}

function sendCookie(res, authToken) {
  const cookieOptions = { httpOnly: true, maxAge: parseInt(config.get('auth.cookieMaxAge')) };
  res.cookie('authToken', authToken, cookieOptions);
}

//create router
const router = express.Router();

// register routes
router.get(
  '/list',
  hasPermissions('manageUser'),
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
  '/me',
  isLoggedIn(),
  asyncCatch(async (req, res, next) => {
    const userId = newId(req.auth._id);
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
router.get(
  '/:userId',
  hasPermissions('manageUser'),
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
    user.role = null;
    user.createdDate = new Date();

    //hash password
    const saltRounds = parseInt(config.get('auth.saltRounds'));
    user.password = await bcrypt.hash(user.password, saltRounds);

    const emailExists = await dbModule.findUserByEmail(user.email);

    if (emailExists) {
      res.status(400).json({
        error: `Email ${user.email} already registered`,
      });
    } else {
      const authToken = await issueToken(user);
      sendCookie(res, authToken);

      await dbModule.insertOneUser(user);

      const edit = {
        timestamp: new Date(),
        op: 'insert',
        col: 'user',
        target: { userId: user._id },
        update: user,
        auth: req.auth,
      };
      await dbModule.saveEdit(edit);

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
      // issue token

      const authToken = await issueToken(user);
      sendCookie(res, authToken);

      res.json({ message: 'Welcome back', userId: user._id, token: authToken });
    } else {
      res.status(400).json({
        error: 'Invalid login credentials',
      });
    }
  })
);
router.put(
  '/me',
  isLoggedIn(),
  validBody(updateUserSchema),
  asyncCatch(async (req, res, next) => {
    const userId = newId(req.auth._id);
    const update = req.body;

    if (update.password) {
      const saltRounds = parseInt(config.get('auth.saltRounds'));
      update.password = await bcrypt.hash(update.password, saltRounds);
    }
    debug(req.auth);

    if (update.role) {
      if (!req.auth.permissions['manageUser']) {
        return res.status(403).json({ error: 'You do not have permission to change your role' });
      } else if (Array.isArray(update.role)) {
        // role is already an array
      } else {
        update.role = [update.role];
      }
    }

    if (Object.keys(update).length > 0) {
      update.lastUpdatedOn = new Date();
      update.lastUpdatedBy = {
        _id: req.auth._id,
        email: req.auth.email,
        fullName: req.auth.fullName,
        role: req.auth.role,
      };
    } else {
      return res.json({ message: 'no fields edited' });
    }

    const dbResult = await dbModule.updateOneUser(userId, update);

    if (dbResult.matchedCount > 0) {
      const edit = {
        timestamp: new Date(),
        op: 'update',
        col: 'user',
        target: { userId },
        update,
        auth: req.auth,
      };

      await dbModule.saveEdit(edit);

      const authPayload = {
        _id: req.auth._id,
        email: update.email ?? req.auth.email,
        fullName: update.fullName ?? req.auth.fullName,
        role: update.role ?? req.auth.role,
      };

      const authToken = await issueToken(authPayload);
      sendCookie(res, authToken);

      res.status(200).json({
        message: `user ${userId} updated`,
        token: authToken,
      });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  })
);
router.put(
  '/:userId',
  hasPermissions('manageUser'),
  validId('userId'),
  validBody(updateUserSchema),
  asyncCatch(async (req, res, next) => {
    const userId = req.userId;
    const update = req.body;

    if (update.password) {
      const saltRounds = parseInt(config.get('auth.saltRounds'));
      update.password = await bcrypt.hash(update.password, saltRounds);
    }
    if (update.role) {
      if (Array.isArray(update.role)) {
        // role is already an array
      } else {
        update.role = [update.role];
      }
    }

    if (Object.keys(update).length > 0) {
      update.lastUpdatedOn = new Date();
      update.lastUpdatedBy = {
        _id: req.auth._id,
        email: req.auth.email,
        fullName: req.auth.fullName,
        role: req.auth.role,
      };
    } else {
      return res.json({ message: 'No fields edited' });
    }

    const dbResult = await dbModule.updateOneUser(userId, update);

    if (dbResult.matchedCount > 0) {
      const edit = {
        timestamp: new Date(),
        op: 'update',
        col: 'user',
        target: { userId },
        update,
        auth: req.auth,
      };

      await dbModule.saveEdit(edit);

      if (userId.equals(newId(req.auth._id))) {
        const authPayload = {
          _id: req.auth._id,
          email: update.email ?? req.auth.email,
          fullName: update.fullName ?? req.auth.fullName,
          role: update.role ?? req.auth.role,
        };

        const authToken = await issueToken(authPayload);
        sendCookie(res, authToken);

        res.status(200).json({
          message: `user ${userId} updated`,
          token: authToken,
        });
      } else {
        res.status(200).json({
          message: `user ${userId} updated`,
          
        });
      }
    } else {
      res.status(404).json({ error: `User ${userId} not found` });
    }
  })
);
router.delete(
  '/:userId',
  hasPermissions('manageUser'),
  validId('userId'),
  asyncCatch(async (req, res, next) => {
    const userId = req.userId;
    const dbResult = await dbModule.deleteOneUser(userId);
    debug(dbResult);
    if (dbResult.deletedCount > 0) {
      const edit = {
        timestamp: new Date(),
        op: 'delete',
        col: 'user',
        target: { userId },
        auth: req.auth,
      };
      await dbModule.saveEdit(edit);
      res.json({
        message: `User ${userId} deleted`,
      });
    } else {
      res.status(404).json({
        message: `User ${userId} not found`,
      });
    }
  })
);

//export router
module.exports = router;
