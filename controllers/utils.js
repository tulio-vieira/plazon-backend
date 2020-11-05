const { body } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Like = require('../models/like');
const Follow = require('../models/follow');

module.exports.nameAndUsernameValidators = [

  body('username').isAlphanumeric().withMessage('alphanumeric characters only')
  .isLength({ min: 1, max: 50}).withMessage('must not be empty or exceed 50 characters'),

  body('name').isLength({ min: 1, max: 50}).withMessage('must not be empty or exceed 50 characters')
  .custom(name => {
    if (name && name.match(/[ ]{2}|[^a-zA-z0-9 ]/g)) {
        return Promise.reject('alpha-numeric characters or single spaces only');
    } else { return true; }
  })
];

// use this in a try catch block
module.exports.checkUserDuplicatedFields = async (req, fieldsToCheckArr, userId) => {

  const results = await Promise.all(
    fieldsToCheckArr.map(field => {
      return userId ? User.exists({ [field]: req.body[field], _id: { $ne: userId } })
        : User.exists({ [field]: req.body[field] });
    })
  );
  let errors = [];
  if (results.reduce((error, fieldIsDuplicated) => error || fieldIsDuplicated)) {
    for (let i in fieldsToCheckArr) {
      if (results[i]) errors.push({msg: fieldsToCheckArr[i] + ' already exists', param: fieldsToCheckArr[i]});
    }
  }
  return errors;
}

// returns a middleware that attaches the model listing to the request object, with the specified name.
// set the default page and limit if they are not specified in the query 
module.exports.getPaginatedResults = async function ({
  req,
  model,
  page,
  name,
  limit,
  selectFields,
  findOptions,
  populateField,
  selectPopulate,
  sortOptions }) {
 
  page = req.query.page ? parseInt(req.query.page) : page;
  limit = req.query.limit ? parseInt(req.query.limit) : limit;

  const startIndex = (page - 1) * limit
  const endIndex = page * limit

  const results = {}

  if (endIndex < await model.countDocuments(findOptions).exec()) {
    results.next = {
      page: page + 1,
      limit: limit
    }
  }

  if (startIndex > 0) {
    results.previous = {
      page: page - 1,
      limit: limit
    }
  }
  results[name] = await model.find(findOptions)
  .select(selectFields)
  .limit(limit).skip(startIndex)
  .sort(sortOptions)
  .populate(populateField, selectPopulate).lean({ virtuals: true });
  return results;
}


// VERIFY TOKEN MIDDLEWARE
// FORMAT OF TOKEN -> Authorization: Bearer <access_token>
module.exports.verifyToken = (gardUndefinedToken = true) => {

  return (req, res, next) => {
    // Get auth header value
    const bearerHeader = req.headers['authorization'];
    // Check if bearer is undefined
    try {
      if (typeof bearerHeader === 'undefined'
        || bearerHeader === 'Bearer null'
        || bearerHeader === 'Bearer undefined'
        || bearerHeader === 'Bearer'
        || bearerHeader === 'Bearer ') {
        if (!gardUndefinedToken) return next();
        throw new Error('bearer token is undefined')
      };
      // Split at the space
      const bearer = bearerHeader.split(' ');
      // Get token from array
      const token = bearer[1];
      // verify token. If token is wrong or expired, an error is thrown
      const authData = jwt.verify(token, process.env.JWT_KEY);
      // attach user id to request so that it can be used in the next middleware
      req.userId = authData._id;
      // Next middleware
      next();
    } catch(e) {
      return res.status(403).json({errors: [{msg: e.message}]});
    }
  }
}

module.exports.randomString = () => {
  return Math.random().toString(36).substring(2, 15);
}


module.exports.like_thing = (model) => [
  module.exports.verifyToken(),
  async (req, res, next) => {
    if (req.body.isLike === undefined || req.body.isLike === null){
      return res.status(400).json({errors: [{msg: 'Invalid Request'}]});
    }
    const isLike = req.body.isLike === true || req.body.isLike === 'true';
    let like_status = isLike ? 1 : -1;
    try {
      // 1. Find likedoc in database
      let likeDoc = await Like.findOne({ author_id: req.userId, target_id: req.params.id });
      // 2. if the model is being liked/disliked again:
      if (likeDoc && likeDoc.value === isLike) {
        // 2.1. Do these tasks in parallel to remove the like/dislike
        await Promise.all([
          // 2.2 Remove the like doc
          likeDoc.delete(),
          // 2.3 decrement model.like_count if it is a like or decrement model.dislike_count if it is a dislike
          model.findByIdAndUpdate(req.params.id, { $inc: isLike ? { like_count: -1 } : {dislike_count: -1} })
        ])
        // 2.4 Set like_status to 0 to indicate that like/dislike was removed
        like_status = 0;


      // 3. Else, if the model was neutral (not liked or disliked):
      } else if (!likeDoc) {
        await Promise.all([
          // 3.1 Create likeDoc
          Like.create({ author_id: req.userId, target_id: req.params.id, value: isLike }),
          // 3.2 Increment model.like_count if it is a like or increment model.dislike_count if it is a dislike
          model.findByIdAndUpdate(req.params.id, { $inc: isLike ? { like_count: 1 } : {dislike_count: 1} })
        ]);


      // 4. Else, if the model was disliked and is now being liked, or vice-versa
      } else {
        await Promise.all([
          // 4.1 Update likeDoc
          likeDoc.update({ value: isLike }),
          // 4.2 if it is a like: Increment model.like_count and decrement model.dislike_count
          // If it is a dislike: Increment model.dislike_count and decrement model.like_count
          model.findByIdAndUpdate(req.params.id, {
            $inc: isLike ? { like_count: 1, dislike_count: -1 } : { like_count: -1, dislike_count: 1 }
          })
        ]);
      }

      // 5. Return response with like_status 
      return res.json({ author_id: req.userId, target_id: req.params.id, like_status });

    } catch(err) {
      return next(err);
    }
  }
];

module.exports.attach_liked_to_things = async (things, userId) => {
  let results = await Promise.all(things.map(thing => {
    return Like.findOne({author_id: userId, target_id: thing._id}).select('value -_id').lean();
  }));
  things.forEach((thing, i) => {
    thing.liked = results[i] ? (results[i].value ? 1 : -1) : 0;
  })
  return things;
}

module.exports.attach_followed_to_users = async (users, userId) => {
  const results = await Promise.all(users.map(user => {
    return Follow.exists({author_id: userId, target_id: user._id});
  }));
  users.forEach((user, i) => {
    user.followed = results[i];
  })
  return users;
}