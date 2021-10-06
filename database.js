const { MongoClient, ObjectId } = require('mongodb');
const config = require('config');
const debug = require('debug')('app:database');

/**Generate/Parse an ObjectId */
const newId = (str) => ObjectId(str);

/**Global Variable storing the open connection, do not use it directly */
let _db = null;

/**Connect to the database */
async function connect() {
  if (!_db) {
    const dbUrl = config.get('db.url');
    const dbName = config.get('db.name');
    const client = await MongoClient.connect(dbUrl);
    _db = client.db(dbName);
    debug('connected');
  }
  return _db;
}

/**Connect to the database and verify the connection */
async function ping() {
  const db = await connect();
  await db.command({
    ping: 1,
  });
  debug('ping');
}

// FIXME: add more functions here

//User CRUD
async function findAllUsers() {
  const db = await connect();
  const users = await db.collection('user').find({}).toArray();
  return users;
}

async function findUserById(userId) {
  const db = await connect();
  const user = await db.collection('user').findOne({
    _id: {
      $eq: userId,
    },
  });
  return user;
}

async function insertOneUser(user) {
  const db = await connect();

  await db.collection('user').insertOne({
    ...user,
    createdDate: new Date(),
  });
}

async function findUserByEmail(email) {
  const db = await connect();
  const user = await db.collection('user').findOne({
    email: {
      $eq: email,
    },
  });
  return user;
}

async function updateOneUser(userId, update) {
  const db = await connect();
  await db.collection('user').updateOne(
    {
      _id: {
        $eq: userId,
      },
    },
    {
      $set: {
        ...update,
        lastUpdated: new Date(),
      },
    }
  );
}

async function deleteOneUser(userId) {
  const db = await connect();
  await db.collection('user').deleteOne({
    _id: {
      $eq: userId,
    },
  });
}

//Bug CRUD

async function findAllBugs() {
  const db = await connect();
  const bugs = await db.collection('bug').find({}).toArray();
  return bugs;
}

async function findBugById(bugId) {
  const db = await connect();
  const bug = await db.collection('bug').findOne({
    _id: {
      $eq: bugId,
    },
  });
  return bug;
}

async function insertOneBug(bug) {
  const db = await connect();
  await db.collection('bug').insertOne({
    ...bug,
    createdDate: new Date(),
  });
}

async function updateOneBug(bugId, update) {
  const db = await connect();
  await db.collection('bug').updateOne(
    {
      _id: {
        $eq: bugId,
      },
    },
    {
      $set: {
        ...update,
        lastUpdated: new Date(),
      },
    }
  );
}

//Comment CRUD


    
// export functions
module.exports = {
  newId,
  connect,
  ping,
  findAllUsers,
  findUserById,
  insertOneUser,
  findUserByEmail,
  updateOneUser,
  deleteOneUser,
  findAllBugs,
  findBugById,
  insertOneBug,
  updateOneBug,
};

ping();
