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
const { application } = require('express');

const insertTestSchema = Joi.object({
  authorId: Joi.objectId().required(),
  passed: Joi.string().required(),
});

const router = express.Router();

router.put(
  '/:bugId/test/new',
  validId('bugId'),
  validBody(insertTestSchema),
  asyncCatch(async (req, res, next) => {
    const bugId = req.bugId;
    const { authorId, passed } = req.body;

    const author = await dbModule.findUserById(authorId);

    const testCase = {
      _id: newId(),
      authorId: authorId,
      authorName: author.fullName,
      authorRole: author.role,
    }  
    
    if(passed.toLowerCase() === 'true') {
      testCase.passed = true;
    } else if(passed.toLowerCase() === 'false') {
      testCase.passed = false;
    } else {
      res.status(400).json({error: 'passed must be true or false'});
    }

    await dbModule.insertTestCase(bugId, testCase);
    res.status(200).json({message: 'Test Case Created'})
  })
);

module.exports = router;
