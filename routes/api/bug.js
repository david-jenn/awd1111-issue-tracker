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

//create schema
const newBugSchema = Joi.object({
  title: Joi.string().trim().min(1).required(),
  description: Joi.string().trim().min(1).required(),
  stepsToReproduce: Joi.string().trim().min(1).required(),
});

const updateBugSchema = Joi.object({
  title: Joi.string().trim().min(1),
  description: Joi.string().trim().min(1),
  stepsToReproduce: Joi.string().trim().min(1),
});

const classifyBugSchema = Joi.object({
  classification: Joi.string().trim().min(1).required()
})

//create router
const router = express.Router();

// register routes
router.get(
  '/list',
  asyncCatch(async (req, res, next) => {
    const bugs = await dbModule.findAllBugs();
    debug(bugs);
    res.status(200).json(bugs);
  })
);
router.get(
  '/:bugId',
  validId('bugId'),
  asyncCatch(async (req, res, next) => {
    const bugId = newId(req.params.bugId);
    const bug = await dbModule.findBugById(bugId);
    if (!bug) {
      res.status(404).json({
        error: `Bug ${bugId} not found`,
      });
    } else {
      res.status(200).json(bug);
    }
  })
);
router.put(
  '/new',
  validBody(newBugSchema),
  asyncCatch(async (req, res, next) => {
    const bug = req.body;
    bug._id = newId();

    await dbModule.insertOneBug(bug);
    res.status(200).json({
      message: 'New bug reported',
    });
  })
);
router.put(
  '/:bugId',
  validId('bugId'),
  validBody(updateBugSchema),
  asyncCatch(async (req, res, next) => {
  
    const bugId = newId(req.params.bugId);
    const update = req.body;

    const bug = await dbModule.findBugById(bugId);

    if (!bug) {
      res.status(404).json({
        error: 'Bug not found',
      });
    } else {
      await dbModule.updateOneBug(bugId, update);
      res.status(200).json({
        message: `Bug ${bugId} updated`,
      });
    }
  
})
);
router.put('/:bugId/classify',
  validId('bugId'),
  validBody(classifyBugSchema),
  asyncCatch(async (req, res, next) => {
  
    const bugId = newId(req.params.bugId);
    const { classification } = req.body;

    const bug = await dbModule.findBugById(bugId);

    if (!bug) {
      res.status(404).json({ Error: 'Bug not found' });
    } else {
      await dbModule.updateOneBug(bugId, {
        classification: classification,
        classifiedOn: new Date(),
      });
      res.status(200).json({ message: `Bug ${bugId} classified` });
    }
  
})
);
router.put('/:bugId/assign', async (req, res, next) => {
  try {
    const bugId = newId(req.params.bugId);
    const { assignedToUserId, assignedToUserName } = req.body;

    const bug = await dbModule.findBugById(bugId);
    debug(bug);

    if (!bug) {
      res.status(404).json({ error: 'Bug not found' });
    } else if (!assignedToUserId) {
      res.status(400).type('text/plain').send('User Assigned to Id is required');
    } else if (!assignedToUserName) {
      res.status(400).type('text/plain').send('User Assigned to name is required');
    } else {
      await dbModule.updateOneBug(bugId, {
        userAssigned: {
          userId: assignedToUserId,
          userName: assignedToUserName,
        },
        assignedOn: new Date(),
      });

      res.status(200).json({ message: `Bug ${bugId} assigned` });
    }
  } catch (err) {
    next(err);
  }
});
router.put('/:bugId/close', async (req, res, next) => {
  try {
    const bugId = newId(req.params.bugId);
    const { closed } = req.body;

    const bug = await dbModule.findBugById(bugId);
    if (!bug) {
      res.status(404).json({ message: `Bug ${bugId} not found` });
    } else if (closed == 'true') {
      await dbModule.updateOneBug(bugId, {
        closed: true,
        closedOn: new Date(),
      });
      res.status(200).json({ message: `Bug ${bugId} closed` });
    } else if (closed == 'false') {
      await dbModule.updateOneBug(bugId, {
        closed: false,
        closedOn: null,
      });
      res.status(200).json({ message: `Bug ${bugId} opened` });
    } else {
      res.status(400).json({ error: 'Must enter true or false' });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
