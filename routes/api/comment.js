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

const newCommentSchema = Joi.object({
  text: Joi.string().trim().min(1).required(),
  authorId: Joi.objectId().required(),
  // authorName: Joi.string().trim().min(1).required(),
  // author: Joi.object({
  //   _id: Joi.objectId().required(),
  //   name: Joi.string().required()
  // }).required(),
  // bugTitle: Joi.string().trim().min(1).required(),
});

const router = express.Router();

router.get(
  '/:bugId/comment/list',
  validId('bugId'),
  asyncCatch(async (req, res, next) => {
    const bugId = req.bugId;
    debug(bugId);
    const comments = await dbModule.listBugComments(bugId);
    res.status(200).json(comments);
  })
);
router.get(
  '/:bugId/comment/:commentId',
  validId('bugId'),
  validId('commentId'),
  asyncCatch(async (req, res, next) => {
    const bugId = req.bugId;
    const commentId = req.bugId;

    const comment = await dbModule.findOneComment(bugId, commentId);
    res.status(200).json(comment);

  })
);
router.put(
  '/:bugId/comment/new',
  validId('bugId'),
  validBody(newCommentSchema),
  asyncCatch(async (req, res, next) => {
    const bugId = req.bugId;
    const { text, authorId } = req.body;
    debug(bugId, text, authorId);

    const author = await dbModule.findUserById(authorId);
    const bug = await dbModule.findBugById(bugId);


    const comment = {
      text: text,
      author: {
        _id: authorId,
        name: author.fullName,
        role: author.role
      },
      bug: {
        _id: bugId,
        title: bug.title,
      },
    };
    debug(comment);

    await dbModule.insertBugComment(comment);
    res.status(200).json({ message: 'comment posted' });
  })
);

module.exports = router;