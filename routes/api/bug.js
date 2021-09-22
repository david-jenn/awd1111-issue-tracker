const debug = require('debug')('app:route:user');
const express = require('express');
const moment = require('moment');
const _ = require('lodash');
const { nanoid } = require('nanoid');

//fix me put data in
const bugsArray = [ 
  {
    _id: '1',
    title: 'Alpha Bug',
    description: 'This is the Alpha Bug',
    stepsToReproduce: 'Open up this part of the application and select options'
  },
  {
    _id: '2',
    title: 'Beta Bug',
    description: 'This is the Beta Bug',
    stepsToReproduce: 'Close this application and it does not auto save'
  },
  {
    _id: '3',
    title: 'Charlie Bug',
    description: 'This is the Charlie Bug',
    stepsToReproduce: 'When doing an edit the system does not work properly'
  }
];

//create router 
const router = express.Router();

// register routes
router.get('/list', (req, res, next) => {
  res.json(bugsArray);
});
router.get('/:bugId', (req, res, next) => {
  const bugId = req.params.bugId;
  const bug = bugsArray.find(x => x._id == bugId);
  if(!bug) {
    res.status(404).type('text/plain').send(`Bug ${bugId} not found`)
  } else {
    res.json(bug);
  }
});
router.put('/new', (req, res, next) => {
  const bugId = nanoid();
  const { _id, title, description, stepsToReproduce } = req.body;

  const bug = {
    _id: bugId,
    title,
    description,
    stepsToReproduce,
    createdDate: new Date()
  }
  if (!title) {
    res.status(400).type('text/plain').send('Title must be provided');
  } else if(!description) {
    res.status(400).type('text/plain').send('Description must be provided');
  } else if(!stepsToReproduce) {
    res.status(400).type('text/plain').send('Steps To Reproduce must be provided');
  } else {
    bugsArray.push(bug);
    res.status(200).type('text/plain').send('New bug reported!');
  }
});
router.put('/:bugId', (req, res, next) => {
  const bugId = req.params.bugId;
  const {title, description, stepsToReproduce} = req.body;

  const bug = bugsArray.find(x => x._id == bugId);
  if(!bug) {
    res.status(404).type('text/plain').send(`Bug ${bugId} not found`)
  } else {
    if(title != undefined) {
      bug.title = title;
    }
    if(description != undefined) {
      bug.description = description;
    }
    if(stepsToReproduce != undefined) {
      bug.stepsToReproduce = stepsToReproduce;
    }
    bug.lastUpdated = new Date();
    res.status(200).type('text/plain').send('Bug Updated');

  }
});
router.put('/:bugId/classify', (req, res, next) => {
  const bugId = req.params.bugId;
  const { classification }  = req.body;

  const bug = bugsArray.find(x => x._id == bugId);
  if(!bug) {
    res.status(400).type('text/plain').send(`Bug ${bugId} not found`);
  } else if(!classification) {
    res.status(400).type('text/plain').send('Must enter a classification')
  } else {
    bug.classification = classification
    bug.classifiedOn = new Date();
    bug.lastUpdated = new Date();

    res.status(200).type('text/plain').send('Bug Classified!');
  }

});
router.put('/:bugId/assign', (req, res, next) => {
  const bugId = req.params.bugId;
  const { assignedToUserId, assignedToUserName } = req.body;

  const bug = bugsArray.find(x => x._id == bugId);
  
  if(!bug) {
    res.status(404).type('text/plain').send(`Bug ${bugId} not found`);
  } else if (!assignedToUserId){
    res.status(400).type('text/plain').send('User Assigned to Id is required')
  } else if (!assignedToUserName) {
    res.status(400).type('text/plain').send('User Assigned to name is required')
  } else {
    bug.assignedToUserId = assignedToUserId;
    bug.assignedToUserName = assignedToUserName;
    bug.assignedOn = new Date();
    bug.lastUpdated = new Date();
    
    res.status(200).type('text/plain').send('Bug Assigned!')
  }
});
router.put('/:bugId/close', (req, res, next) => {
  //fixme close bug and json response
});

module.exports = router;