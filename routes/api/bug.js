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
const { date } = require('joi');

//create schemas
const newBugSchema = Joi.object({
  title: Joi.string().trim().min(1).required(),
  description: Joi.string().trim().min(1).required(),
  stepsToReproduce: Joi.string().trim().min(1).required(),
}).required();

const updateBugSchema = Joi.object({
  title: Joi.string().trim().min(1),
  description: Joi.string().trim().min(1),
  stepsToReproduce: Joi.string().trim().min(1),
});

const classifyBugSchema = Joi.object({
  classification: Joi.string().trim().valid('Approved', 'Unapproved', 'Duplicate', 'Unclassified').required(),
}).required();

const assignBugSchema = Joi.object({
  userAssigned: Joi.objectId().required(),
}).required();

const closeBugSchema = Joi.object({
  closed: Joi.string().required(),
}).required();

//create router
const router = express.Router();

// register routes
router.get(
  '/list',
  asyncCatch(async (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: 'You must be logged in' });
    }

    //Get inputs
    let { keywords, classification, maxAge, minAge, open, closed, sortBy, pageSize, pageNumber } = req.query;
    minAge = parseInt(minAge);
    maxAge = parseInt(maxAge);

    const today = new Date();
    today.setHours(0);
    today.setMinutes(0);
    today.setSeconds(0);
    today.setMilliseconds(0);

    const maxDate = new Date(today);
    const minDate = new Date(today);

    //match
    const match = {};

    if (keywords) {
      match.$text = { $search: keywords };
    }
    if (classification) {
      match.classification = { $eq: classification };
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

    open = open ?? true;
    closed = closed ?? false;
    debug(closed);
    open = open === true || open.toLowerCase() === 'true';
    closed = closed === true || closed.toString().toLowerCase() === 'true';
    debug(closed, open);

    if (closed && open) {
      // No filter because all bugs should be shown
    } else if (open) {
      match.closed = { $in: [null, false] };
    } else if (closed) {
      match.closed = { $eq: true };
    } else {
      return res.send([]);
    }

    //sort
    let sort = { createdDate: -1 };
    switch (sortBy) {
      case 'newest':
        sort = { createdDate: -1 };
        break;
      case 'oldest':
        sort = { createdDate: 1 };
        break;
      case 'title':
        sort = { title: 1, createdDate: 1 };
        break;
      case 'classification':
        sort = { classification: 1, createdDate: 1 };
        break;
      case 'assignedTo':
        sort = { 'userAssigned.userName': 1, createdDate: 1 };
        break;
      case 'createdBy':
        sort = { 'author.fullName': 1, createdDate: 1 };
        break;
    }

    pageNumber = parseInt(pageNumber) || 1;
    pageSize = parseInt(pageSize) || 5;
    const skip = (pageNumber - 1) * pageSize;
    const limit = pageSize;

    const pipeline = [{ $match: match }, { $sort: sort }, { $skip: skip }, { $limit: limit }];
    debug(pipeline);

    const db = await connect();
    const cursor = db.collection('bug').aggregate(pipeline);
    const results = await cursor.toArray();
    res.status(200).send(results);
  })
);
router.get(
  '/:bugId',
  validId('bugId'),
  asyncCatch(async (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: 'You must be logged in' });
    }

    const bugId = req.bugId;
    const bug = await dbModule.findBugById(bugId);
    if (!bug) {
      res.status(404).json({
        error: `Bug ${bugId} not found`,
      });
    } else {
      res.status(200).json(bug);
      debug(bug);
    }
  })
);
router.put(
  '/new',
  validBody(newBugSchema),
  asyncCatch(async (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: 'You must be logged in' });
    }
    const bug = req.body;
    bug._id = newId();
    bug.createdDate = new Date();
    bug.createdBy = req.auth;
    bug.closed = false;
    bug.classification = 'unclassified';
    const bugId = bug._id;

    const edit = {
      timestamp: new Date(),
      op: 'insert',
      col: 'bug',
      target: { bugId: bug._id },
      update: bug,
      auth: req.auth,
    };

    await dbModule.insertOneBug(bug);
    await dbModule.saveEdit(edit);
    res.status(200).json({
      message: `New bug ${bugId} reported`,
    });
  })
);
router.put(
  '/:bugId',
  validId('bugId'),
  validBody(updateBugSchema),
  asyncCatch(async (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: 'You must be logged in' });
    }

    const bugId = req.bugId;
    const update = req.body;

    
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

    const dbResult = await dbModule.updateOneBug(bugId, update);
    debug(dbResult);

    if (dbResult.matchedCount > 0) {
      const edit = {
        timestamp: new Date(),
        op: 'update',
        col: 'bug',
        target: { bugId },
        update: update,
        auth: req.auth,
      };
      await dbModule.saveEdit(edit);
      res.status(200).json({
        message: `Bug ${bugId} updated`,
      });
    } else {
      res.status(404).json({
        message: `Bug ${bugId} not found`,
      });
    }
  })
);
router.put(
  '/:bugId/classify',
  validId('bugId'),
  validBody(classifyBugSchema),
  asyncCatch(async (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: 'You must be logged in' });
    }

    const bugId = req.bugId;
    const classification = req.body.classification;

    const update = {};
    update.lastUpdatedOn = new Date();
    update.lastUpdatedBy = {
      _id: req.auth._id,
      email: req.auth.email,
      fullName: req.auth.fullName,
      role: req.auth.role,
    };
    update.classification = classification;
    update.classifiedOn = new Date();
    update.classifiedBy = {
      _id: req.auth._id,
      email: req.auth.email,
      fullName: req.auth.fullName,
      role: req.auth.role,
    };

    const dbResult = await dbModule.updateOneBug(bugId, update);

    if (dbResult.matchedCount > 0) {
      const edit = {
        timestamp: new Date(),
        op: 'update',
        col: 'bug',
        target: { bugId },
        update: update,
        auth: req.auth,
      };
      await dbModule.saveEdit(edit);
      res.json({ Message: `Bug ${bugId} classified` });
    } else {
      res.status(404).json({ Error: `Bug ${bugId} not found` });
    }
  })
);
router.put(
  '/:bugId/assign',
  validId('bugId'),
  validBody(assignBugSchema),
  asyncCatch(async (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: 'You must be logged in' });
    }

    const bugId = req.bugId;
    const userAssignedId = newId(req.body.userAssigned);
    const userAssigned = await dbModule.findUserById(userAssignedId);
    if (!userAssigned) {
      return res.status(404).json(`User ${userAssignedId} not found`);
    }

    const update = {};
    update.lastUpdatedOn = new Date();
    update.lastUpdatedBy = {
      _id: req.auth._id,
      email: req.auth.email,
      fullName: req.auth.fullName,
      role: req.auth.role,
    };
    update.assignedOn = new Date();
    update.assignedBy = {
      _id: req.auth._id,
      email: req.auth.email,
      fullName: req.auth.fullName,
      role: req.auth.role,
    };
    update.assignedTo = {
      _id: userAssigned._id,
      email: userAssigned.email,
      fullName: userAssigned.fullName,
      role: userAssigned.role,
    };
    debug(update);

    const dbResult = await dbModule.updateOneBug(bugId, update);

    if (dbResult.matchedCount > 0) {
      const edit = {
        timestamp: new Date(),
        op: 'update',
        col: 'bug',
        target: { bugId },
        update: update,
        auth: req.auth,
      };
      await dbModule.saveEdit(edit);
      res.json({ Message: `Bug ${bugId} assigned` });
    } else {
      res.status(404).json({ Error: `Bug ${bugId} not found` });
    }
  })
);
router.put(
  '/:bugId/close',
  validId('bugId'),
  validBody(closeBugSchema),
  asyncCatch(async (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: 'You must be logged in' });
    }

    const bugId = req.bugId;
    const closed = req.body.closed;
    debug(closed);
    debug(typeof closed);

    const update = {};

    if (closed.toLowerCase() === 'true') {
      update.lastUpdatedOn = new Date();
      update.lastUpdatedBy = {
        _id: req.auth._id,
        email: req.auth.email,
        fullName: req.auth.fullName,
        role: req.auth.role,
      };
      update.closed = true;
      update.closedOn = new Date();
      update.closedBy = {
        _id: req.auth._id,
        email: req.auth.email,
        fullName: req.auth.fullName,
        role: req.auth.role,
      };
    } else if (closed.toLowerCase() === 'false') {
      update.lastUpdatedOn = new Date();
      update.lastUpdatedBy = {
        _id: req.auth._id,
        email: req.auth.email,
        fullName: req.auth.fullName,
        role: req.auth.role,
      };
      update.closed = false;
      update.closedOn = null;
      update.closedBy = null;
    } else {
      return res.status(400).json({ error: 'Must enter true or false for closed' });
    }

    const dbResult = await dbModule.updateOneBug(bugId, update);
    debug(dbResult);

    if (dbResult.matchedCount > 0) {
      const edit = {
        timestamp: new Date(),
        op: 'update',
        col: 'bug',
        target: { bugId },
        update: update,
        auth: req.auth,
      };
      await dbModule.saveEdit(edit);
      if (update.closed) {
        res.json({ message: `Bug ${bugId} closed` });
      } else {
        res.json({ message: `Bug ${bugId} opened` });
      }
    } else {
      res.json({ error: `Bug ${bugId} not found` });
    }
  })
);

module.exports = router;
