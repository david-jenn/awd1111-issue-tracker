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
const hasPermissions = require('../../middleware/hasPermissions');

const newCommentSchema = Joi.object({
  text: Joi.string().trim().min(1).required(),
 });

const router = express.Router();

router.get(
  '/:bugId/comment/list',
  hasPermissions('viewComment'),
  validId('bugId'),
  asyncCatch(async (req, res, next) => {

    if (!req.auth) {
      return res.status(401).json({ error: 'You must be logged in' });
    }

    const bugId = req.bugId;
    debug(bugId);
    const comments = await dbModule.findBugComments(bugId);
    res.status(200).json(comments);
  })
);
router.get(
  '/:bugId/comment/:commentId',
  hasPermissions('viewComment'),
  validId('bugId'),
  validId('commentId'),
  asyncCatch(async (req, res, next) => {

    if (!req.auth) {
      return res.status(401).json({ error: 'You must be logged in' });
    }

    const bugId = req.bugId;
    const commentId = req.commentId;

    const comment = await dbModule.findOneComment(bugId, commentId);

    if (!comment) {
      res.status(404).json({ error: `Comment ${commentId} not found` });
    } else {
      res.status(200).json(comment);
    }
  })
);
router.put(
  '/:bugId/comment/new',
  hasPermissions('createComment'),
  validId('bugId'),
  validBody(newCommentSchema),
  asyncCatch(async (req, res, next) => {

    if (!req.auth) {
      return res.status(401).json({ error: 'You must be logged in' });
    }
    
    const bugId = req.bugId;
    const text = req.body.text;

    const comment = {
      _id: newId(),
      text: text,
      author: {
        _id: req.auth._id,
        fullName: req.auth.fullName,
        email: req.auth.email,
        role: req.auth.role,
      },
      bugId: bugId,
    };
    debug(comment);
    const commentId = comment._id;

    await dbModule.insertBugComment(comment);
    res.status(200).json({ message: `Comment ${commentId} posted` });
  })
);

module.exports = router;
