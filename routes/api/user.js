const debug = require('debug')('app:route:user');
const express = require('express');
const moment = require('moment');
const _ = require('lodash');
const { nanoid } = require('nanoid');

const userArray = [
  {
    _id: '1',
    email: 'david_jenn@insideranken.org',
    password: 'password',
    givenName: 'David',
    familyName: 'Jenn',
    fullName: 'David Jenn',
    role: 'developer',
    dateCreated: new Date()
  },
  {
    _id: '2',
    email: 'john_doe@insideranken.org',
    password: 'password2',
    givenName: 'John',
    familyName: 'Doe',
    fullName: 'John Doe',
    role: 'quality analyst',
    dateCreated: new Date()
  },
  {
    _id: '3',
    email: 'bob_smith@insideranken.org',
    password: 'password3',
    givenName: 'Bob',
    lastName: 'Smith',
    fullName: 'Bob Smith',
    role: 'developer',
    dateCreated: new Date()
  },
];

//create router
const router = express.Router();

// register routes
router.get('/list', (req, res, next) => {
  res.json(userArray);
});
router.get('/:userId', (req, res, next) => {
  const userId = req.params.userId;
  const user = userArray.find((x) => x._id == userId);
  if (!user) {
    res.status(404).type('text/plain').send(`User ${userId} not found`);
  } else {
    res.json(user);
  }
});
router.post('/register', (req, res, next) => {
  const userId = nanoid();
  const { email, password, fullName, givenName, familyName, role } = req.body;

  const user = {
    _id: userId,
    email,
    password,
    fullName,
    givenName,
    familyName,
    role,
    createdDate: new Date(),
  };

  const duplicateEmail = userArray.find((x) => x.email == email);

  if (!email) {
    res.status(400).type('text/plain').send('Email is required');
  } else if (duplicateEmail) {
    res.status(400).type('text/plain').send('Email already registered');
  } else if (!password) {
    res.status(400).type('text/plain').send('Password is required');
  } else if (!fullName) {
    res.status(400).type('text/plain').send('Full name is required');
  } else if (!givenName) {
    res.status(400).type('text/plain').send('Given name is required');
  } else if (!familyName) {
    res.status(400).type('text/plain').send('Family name is required');
  } else if (!role) {
    res.status(400).type('text/plain').send('Role is required');
  } else {
    userArray.push(user);
    res.status(200).type('text/plain').send('New user registered!');
  }
});
router.post('/login', (req, res, next) => {
  const { email, password } = req.body;

  const userIndex = userArray.findIndex((x) => x.email == email);
  console.log(userIndex);

  if (!email || !password) {
    res.status(400).type('text/plain').send('Please enter your login credentials');
  } else if (userArray[userIndex].password == password) {
    res.status(200).type('text/plain').send('Welcome Back');
  } else {
    res.status(400).type('text/plain').send('Invalid login credential provided. Please try again');
  }
});
router.put('/:userId', (req, res, next) => {
  const userId = req.params.userId;
  const { password, fullName, givenName, familyName, role } = req.body;

  const user = userArray.find((x) => x._id == userId);

  if (!user) {
    res.status(404).type('text/plain').send(`User ${userId} not found`);
  } else {
    if (password != undefined) {
      user.password = password;
    }
    if (fullName != undefined) {
      user.fullName = fullName;
    }
    if (givenName != undefined) {
      user.givenName = givenName;
    }
    if (familyName != undefined) {
      user.familyName = familyName;
    }
    if (role != undefined) {
      user.role = role;
    }
    user.lastUpdated = new Date();
    res.status(200).type('text/plain').send('User updated!');
  }
});
router.delete('/:userId', (req, res, next) => {
  const userId = req.params.userId;
  const userIndex = userArray.findIndex((x) => x._id == userId);
  if(userIndex < 0) {
    res.status(404).type('text/plain').send(`User ${userId} not found`);
  } else {
    userArray.splice(userIndex, 1);
    res.status(200).type('plain/text').send('User deleted!');
  }
});

//export router
module.exports = router;
