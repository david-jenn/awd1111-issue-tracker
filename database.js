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

  await db.collection('user').insertOne(user);
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
  return await db.collection('user').updateOne(
    {
      _id: {
        $eq: userId,
      },
    },
    {
      $set: {
        ...update,
      },
    }
  );
}

async function deleteOneUser(userId) {
  const db = await connect();
  return await db.collection('user').deleteOne({
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
  await db.collection('bug').insertOne(bug);
}

async function updateOneBug(bugId, update) {
  const db = await connect();
  return await db.collection('bug').updateOne(
    {
      _id: {
        $eq: bugId,
      },
    },
    {
      $set: {
        ...update,
      },
    }
  );
}

//Comment CRUD

async function findBugComments(bugId) {
  const db = await connect();
  const comments = await db
    .collection('comment')
    .find({ bugId: { $eq: bugId } })
    .toArray();
  return comments;
}

async function findOneComment(bugId, commentId) {
  const db = await connect();
  const comment = await db.collection('comment').findOne({
    _id: {
      $eq: commentId,
    },
    bugId: {
      $eq: bugId,
    },
  });
  return comment;
}

async function insertBugComment(comment) {
  const db = await connect();
  await db.collection('comment').insertOne({
    ...comment,
    createdDate: new Date(),
  });
}

//Test Case CRUD

async function findBugTestCases(bugId) {
  const db = await connect();
  const bug = await db.collection('bug').findOne({
    _id: {
      $eq: bugId,
    },
  });
  return bug.test_cases;

}
async function findOneTestCase(bugId, testId) {
  const db = await connect();
  const bug = await db.collection('bug').findOne({
    _id: {
      $eq: bugId,
    },
  });
  return bug.test_cases?.find((x) => x._id.equals(testId));
}

async function insertTestCase(bugId, testCase) {
  const db = await connect();
  testCase.dateTested = new Date();
  await db.collection('bug').updateOne({ _id: { $eq: bugId } }, { $push: { testCases: testCase } });
}

async function updateTestCase(bugId, testId, update) {
  const db = await connect();

  const updatedFields = {};
  for (const key in update) {
    updatedFields['testCases.$.' + key] = update[key];
  }

  return await db
    .collection('bug')
    .updateOne({ _id: { $eq: bugId }, 'testCases._id': { $eq: testId } }, { $set: updatedFields });
}

async function deleteOneTestCase(bugId, testId) {
  const db = await connect();
  return await db.collection('bug').updateOne(
    {
      _id: {
        $eq: bugId,
      },
      'testCases._id': { $eq: testId },
    },
    { $pull: { testCases: { _id: testId } } }
  );
}

async function saveEdit(edit) {
  const db = await connect();
  return await db.collection('edit').insertOne(edit);
}

async function findRoleByName(roleName) {
  const db = await connect();
  const role = await db.collection('role').findOne({
    name: {
      $eq: roleName,
    },
  });
  return role;
}


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
  findBugComments,
  findOneComment,
  insertBugComment,
  findBugTestCases,
  findOneTestCase,
  insertTestCase,
  updateTestCase,
  deleteOneTestCase,
  saveEdit,
  findRoleByName,
};

ping();
