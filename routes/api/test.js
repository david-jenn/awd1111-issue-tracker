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
  authorId: Joi.objectId().required(),
  passed: Joi.string().min(4).required(),
  text: Joi.string().min(1).required(),
});

const updateTestSchema = Joi.object({
  text: Joi.string().min(1).required(),
});

const executeTestSchema = Joi.object({
  passed: Joi.string().min(4).required(),
});

const router = express.Router();

router.get(
  '/:bugId/test/list',
  validId('bugId'),
  asyncCatch(async (req, res, next) => {
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
    const bugId = req.bugId;
    const testId = req.testId;

    const testCase = await dbModule.findOneTestCase(bugId, testId);

    if (!testCase) {
      res.status(404).json({ error: 'Test Case not found' });
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
    const bugId = req.bugId;
    const { authorId, passed, text } = req.body;

    const author = await dbModule.findUserById(authorId);
    debug(author.role, author.fullName);

    const testCase = {
      _id: newId(),
      authorId: authorId,
      authorName: author.fullName,
      authorRole: author.role,
      text: text,
    };

    if (passed.toLowerCase() === 'true') {
      testCase.passed = true;
    } else if (passed.toLowerCase() === 'false') {
      testCase.passed = false;
    } else {
      res.status(400).json({ error: 'passed must be true or false' });
    }
    debug(testCase);
    await dbModule.insertTestCase(bugId, testCase);
    res.status(200).json({ message: 'Test Case Created' });
  })
);

router.put(
  '/:bugId/test/:testId',
  validId('bugId'),
  validId('testId'),
  validBody(updateTestSchema),
  asyncCatch(async (req, res, next) => {
    const bugId = req.bugId;
    const testId = req.testId;
    const { text } = req.body;
    const testCase = await dbModule.findOneTestCase(bugId, testId);

    debug(testCase);
    if (!testCase) {
      res.status(404).status({ error: 'Test case not found' });
    } else {
      const update = {
        text: text,
        lastUpdated: new Date(),
      };

      await dbModule.updateTestCase(bugId, testId, update);
      res.status(200).json({ message: 'Test Case Updated' });
    }
  })
);

router.put(
  '/:bugId/test/:testId/execute',
  validId('bugId'),
  validId('testId'),
  validBody(executeTestSchema),
  asyncCatch(async (req, res, next) => {
    const bugId = req.bugId;
    const testId = req.testId;
    const { passed } = req.body;
    const testCase = await dbModule.findOneTestCase(bugId, testId);

    debug(testCase);
    if (!testCase) {
      res.status(404).status({ error: 'Test case not found' });
    } else {
      const update = { dateTested: new Date() };

      if (passed.toLowerCase() === 'true') {
        update.passed = true;
        await dbModule.updateTestCase(bugId, testId, update);
        res.status(200).json({ message: 'Test Case Updated' });
      } else if (passed.toLowerCase() === 'false') {
        update.passed = false;
        await dbModule.executeTestCase(bugId, testId, update);
        res.status(200).json({ message: 'Test Case Updated' });
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
    const bugId = req.bugId;
    const testId = req.testId;
    const testCase = await dbModule.findOneTestCase(bugId, testId);

    debug(testCase);
    if (!testCase) {
      res.status(404).status({ error: 'Test case not found' });
    } else {
      await dbModule.deleteOneTestCase(bugId, testId);
      res.status(200).json({ message: 'Test Case Deleted' });
    }
  })
);

module.exports = router;
