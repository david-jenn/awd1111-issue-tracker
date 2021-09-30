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
    const users = await dbModule.findAllUsers();
    debug(users);
    res.json(users);
  } catch (err) {
    next(err);
  }
});
router.get('/:userId', async (req, res, next) => {
  try {
    const userId = newId(req.params.userId);
    const user = await dbModule.findUserById(userId);
    debug(user);
    if (!user) {
      res.status(404).json({ error: `user ${userId} not found` });
    } else {
      res.json(user);
    }
  } catch (err) {
    next(err);
  }
});
router.post('/register', async (req, res, next) => {
  try {
    const user = {
      _id: newId(),
      email: req.body.email,
      password: req.body.password,
      fullName: req.body.fullName,
      givenName: req.body.givenName,
      familyName: req.body.familyName,
      role: req.body.role,
    };

    
      if (!user.email) {
        res.status(400).json({ error: 'Email is required' });
      } else if (!user.password) {
        res.status(400).json({ error: 'Password is required' });
      } else if (!user.fullName) {
        res.status(400).json({ error: 'Full Name is required' });
      } else if (!user.givenName) {
        res.status(400).json({ error: 'Given Name is required' });
      } else if (!user.familyName) {
        res.status(400).json({ error: 'Family Name is required' });
      } else if (!user.role) {
        res.status(400).json({ error: 'Role is required' });
      } else {
        const emailExists = await dbModule.findUserByEmail(user.email);
        if (emailExists) {
          res.status(400).json({ error: 'Email is already registered' });
        } else {
          await dbModule.insertOneUser(user);
          res.status(200).json({ Success: 'New User Registered!' });
        }
      }
    } catch (err) {
    next(err);
  }
});
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await dbModule.findUserByEmail(email);

    if (!email || !password) {
      res.status(400).json({error: 'Please enter your email and password'});
    } else if (user.password == password) {
      res.status(200).json({message: 'Welcome Back'});
    } else {
      res.status(400).json({error: 'Invalid login credentials'});
    }
  } catch (err) {
    next(err);
  }
});
router.put('/:userId', async (req, res, next) => {
  try {
    const userId = newId(req.params.userId);
    const update = req.body;

    const user = await dbModule.findUserById(userId);

    if (!user) {
      res.status(404).json({ Error: `User ${userId} not found` });
    } else {
      await dbModule.updateOneUser(userId, update);
      res.status(200).json({ message: `user ${userId} updated` });
    }
  } catch (err) {
    next(err);
  }
});
router.delete('/:userId', async (req, res, next) => {
  try {
    const userId = newId(req.params.userId);
    const user = await dbModule.findUserById(userId);
    if (!user) {
      res.status(404).json({ Error: `User ${userId} not found` });
    } else {
      res.status(200).json({ message: `User ${userId} deleted` });
    }
  } catch (err) {
    next(err);
  }
});

//export router
module.exports = router;
