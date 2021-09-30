const debug = require('debug')('app:route:user');
const express = require('express');
const moment = require('moment');
const _ = require('lodash');
const { nanoid } = require('nanoid');
const dbModule = require('../../database');
const { newId } = require('../../database');

//create router
const router = express.Router();

// register routes
router.get('/list', async (req, res, next) => {
  try {
    const bugs = await dbModule.findAllBugs();
    debug(bugs);
    res.status(200).json(bugs);
  } catch (err) {
    next(err);
  }
});
router.get('/:bugId', async (req, res, next) => {
  try {
    const bugId = newId(req.params.bugId);
    const bug = await dbModule.findBugById(bugId);
    if (!bug) {
      res.status(404).json({
        error: `Bug ${bugId} not found`,
      });
    } else {
      res.status(200).json(bug);
    }
  } catch (err) {
    next(err);
  }
});
router.put('/new', async (req, res, next) => {
  try {
    const bug = {
      _id: newId(),
      title: req.body.title,
      description: req.body.description,
      stepsToReproduce: req.body.stepsToReproduce,
    };
    if (!bug.title) {
      res.status(400).json({
        error: 'Title must be provided',
      });
    } else if (!bug.description) {
      res.status(400).json({
        error: 'Description must be provided',
      });
    } else if (!bug.stepsToReproduce) {
      res.status(400).json({
        error: 'Steps to reproduce must be provided',
      });
    } else {
      await dbModule.insertOneBug(bug);
      res.status(200).json({
        message: 'New bug reported',
      });
    }
  } catch (err) {
    next(err);
  }
});
router.put('/:bugId', async (req, res, next) => {
  try {
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
  } catch (err) {
    next(err);
  }
});
router.put('/:bugId/classify', async (req, res, next) => {
  try {
    const bugId = newId(req.params.bugId);
    const { classification } = req.body;

    const bug = await dbModule.findBugById(bugId);

    if (!bug) {
      res.status(404).json({ Error: 'Bug not found' });
    } else {
      await dbModule.updateOneBug(bugId, {
        classification: classification,
        classifiedOn: new Date()
      });
      res.status(200).json({ message: `Bug ${bugId} classified` });
    }
  } catch (err) {
    next(err);
  }
});
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
        assignedOn: new Date()
      });

      res.status(200).json({message: `Bug ${bugId} assigned`})
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
  if(!bug) {
    res.status(404).json({message: `Bug ${bugId} not found`})
  } else if (closed == 'true') {
    await dbModule.updateOneBug(bugId, {
      closed: true,
      closedOn: new Date()
    });
    res.status(200).json({message: `Bug ${bugId} closed`})
  } else if (closed == 'false'){
    await dbModule.updateOneBug(bugId, {
      closed: false,
      closedOn: null
    });
    res.status(200).json({message: `Bug ${bugId} opened`});
  } else {
    res.status(400).json({error: 'Must enter true or false'});
  }

} catch(err) {
  next(err);
}
});

module.exports = router;
