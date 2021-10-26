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

const insertTestSchema = Joi.object({
  passed: Joi.string().trim().min(4).required(),
  text: Joi.string().trim().min(1).required(),
});

const updateTestSchema = Joi.object({
  text: Joi.string().trim().min(1).required(),
});

const executeTestSchema = Joi.object({
  passed: Joi.string().trim().min(4).required(),
});

const router = express.Router();

router.get(
  '/:bugId/test/list',
  validId('bugId'),
  asyncCatch(async (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: 'You must be logged in' });
    }

    const bugId = req.bugId;

    const testCases = await dbModule.findBugTestCases(bugId);
    res.status(200).json(testCases);
  })
);

router.get(
  '/:bugId/test/:testId',
  validId('bugId'),
  validId('testId'),
  asyncCatch(async (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: 'You must be logged in' });
    }

    const bugId = req.bugId;
    const testId = req.testId;

    const testCase = await dbModule.findOneTestCase(bugId, testId);

    if (!testCase) {
      res.status(404).json({ error: `Test Case ${testId} not found` });
    } else {
      res.status(200).json(testCase);
    }
  })
);

router.put(
  '/:bugId/test/new',
  validId('bugId'),
  validBody(insertTestSchema),
  asyncCatch(async (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: 'You must be logged in' });
    }
    const bugId = req.bugId;
    const { passed, text } = req.body;

    const testCase = {
      _id: newId(),
      createdBy: {
        id: req.auth._id,
        name: req.auth.fullName,
        email: req.auth.email,
        role: req.auth.role,
      },
      text: text,
      bugId: bugId,
      createdOn: new Date(),
    };
    const testId = testCase._id;

    if (passed.toLowerCase() === 'true') {
      testCase.passed = true;
    } else if (passed.toLowerCase() === 'false') {
      testCase.passed = false;
    } else {
      res.status(400).json({ error: 'passed must be true or false' });
    }

    const edit = {
      timestamp: new Date(),
      op: 'insert',
      col: 'testCases',
      target: { bugId, testId },
      update: testCase,
      auth: req.auth,
    };
    await dbModule.saveEdit(edit);
    await dbModule.insertTestCase(bugId, testCase);
    res.status(200).json({ message: `Test Case ${testId} created` });
  })
);

router.put(
  '/:bugId/test/:testId',
  validId('bugId'),
  validId('testId'),
  validBody(updateTestSchema),
  asyncCatch(async (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: 'You must be logged in' });
    }

    const bugId = req.bugId;
    const testId = req.testId;
    const text = req.body.text;

    const update = {
      text: text,
      lastUpdatedBy: {
        _id: req.auth._id,
        email: req.auth.email,
        fullName: req.auth.fullName,
        role: req.auth.role,
      },
      lastUpdatedOn: new Date(),
    };
    debug(update);

    const dbResult = await dbModule.updateTestCase(bugId, testId, update);

    if (dbResult.matchedCount > 0) {
      const edit = {
        timestamp: new Date(),
        op: 'update',
        col: 'testCases',
        target: { bugId, testId },
        update: update,
        auth: req.auth,
      };
      await dbModule.saveEdit(edit);
      res.status(200).json({ message: `Test Case ${testId} Updated` });
    } else {
      res.status(404).json({ error: `Test case ${testId} not found` });
    }
  })
);

router.put(
  '/:bugId/test/:testId/execute',
  validId('bugId'),
  validId('testId'),
  validBody(executeTestSchema),
  asyncCatch(async (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: 'You must be logged in' });
    }
    const bugId = req.bugId;
    const testId = req.testId;
    const passed = req.body.passed;
    const update = {};
    update.executedBy = {
      _id: req.auth._id,
      email: req.auth.email,
      fullName: req.auth.fullName,
      role: req.auth.role,
    };
    update.executedOn = new Date();

    if (passed.toLowerCase() === 'true') {
      update.passed = true;
    } else if (passed.toLowerCase === 'false') {
      update.passed = false;
    } else {
      res.status(404).json({ error: 'Passed must be true or false' });
    }

    const dbResult = await dbModule.updateTestCase(bugId, testId, update);

    if (dbResult.matchedCount > 0) {
      const edit = {
        timestamp: new Date(),
        op: 'execute',
        col: 'testCases',
        target: { bugId, testId },
        update: update,
        auth: req.auth,
      };
      await dbModule.saveEdit(edit);
      res.json({ Message: `Test case ${testId} executed` });
    } else {
      res.status(404).json({ error: `Test case ${testId} not found` });
    }

    debug(testCase);
    if (!testCase) {
      res.status(404).json({ error: `Test Case ${testId} not found` });
    } else {
      const update = { dateTested: new Date() };

      if (passed.toLowerCase() === 'true') {
        update.passed = true;
        await dbModule.updateTestCase(bugId, testId, update);
        res.status(200).json({ message: `Test Case ${testId} Updated` });
      } else if (passed.toLowerCase() === 'false') {
        update.passed = false;
        await dbModule.executeTestCase(bugId, testId, update);
        res.status(200).json({ message: `Test Case ${testId} Updated` });
      } else {
        res.status(400).json({ error: 'passed must be true or false' });
      }
    }
  })
);

router.delete(
  '/:bugId/test/:testId',
  validId('bugId'),
  validId('testId'),
  asyncCatch(async (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: 'You must be logged in' });
    }

    const bugId = req.bugId;
    const testId = req.testId;
    const dbResult = await dbModule.deleteOneTestCase(bugId, testId);

    debug(dbResult);
    if (dbResult.modifiedCount > 0) {
      const edit = {
        timestamp: new Date(),
        op: 'delete',
        col: 'testCases',
        target: { bugId, testId },
        auth: req.auth,
      };
      await dbModule.saveEdit(edit);
      res.json({ message: `Test Case ${testId} Deleted` });
    } else {
      res.json({ error: `Test Case ${testId} not found` });
    }
  })
);

module.exports = router;
