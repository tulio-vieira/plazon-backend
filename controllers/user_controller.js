const User = require('../models/user');
const Follow = require('../models/follow');
const { upload } = require('./multer_config');
const { body, validationResult } = require('express-validator');
const Post = require('../models/post');
const Comment = require('../models/comment');
const fs = require('fs');
const { 
  nameAndUsernameValidators,
  checkUserDuplicatedFields,
  verifyToken,
  attach_followed_to_users,
  getPaginatedResults, 
  attach_liked_to_things } = require('./utils');

module.exports.get_users = [
  verifyToken(false),
  async (req, res, next) => {
    try {
      const paginatedResults = await getPaginatedResults({
        req,
        model: User,
        name: 'users',
        findOptions: req.query.search ? { $or:[
          {name: {$regex: req.query.search, $options: 'i'}},
          {username: {$regex: req.query.search, $options: 'i'}}
        ]} : null,
        page: 1,
        limit: 10,
        selectFields: '-__v -follower_count -password -email -date_created'
      });

      if (!req.userId) return res.json(paginatedResults);

      await attach_followed_to_users(paginatedResults.users, req.userId);

      return res.json(paginatedResults);

    } catch(err) {
      return next(err);
    }
  }
];

module.exports.get_user = [
  verifyToken(false),
  async (req, res, next) => {
    try {
      const [user, followed, following_count] = await Promise.all([
        User.findById(req.params.id).select('-__v -password -email').lean(),
        req.userId ? Follow.exists({ author_id: req.userId, target_id: req.params.id }) : false,
        Follow.countDocuments({ author_id: req.params.id })
      ]);
      if (!user) throw new Error('DOCUMENT_NOT_FOUND')
      user.followed = followed;
      user.following_count = following_count;
      return res.json({ user });
    } catch(e) {
      return next(e);
    }
  }
];

module.exports.follow_user = [
  verifyToken(),
  async (req, res, next) => {
    try {

      const [ followDoc, targetUserExists ] = await Promise.all([
        Follow.findOne({ author_id: req.userId, target_id: req.params.id }),
        User.exists({ _id: req.params.id })
      ]);
      if (!targetUserExists) throw new Error('Target user not found');

      await Promise.all([
        followDoc ? followDoc.delete() : Follow.create({ author_id: req.userId, target_id: req.params.id }),
        User.findByIdAndUpdate(req.params.id, { $inc: { follower_count: followDoc ? -1 : 1 } })
      ]);

      // Return response with follow_status 
      return res.json({ author_id: req.userId, target_id: req.params.id, follow_status: followDoc ? false : true });

    } catch(e) {
      next(e);
    }
  }
];

module.exports.update_user = [

  verifyToken(),

  (req, res, next) => {
    if (req.userId !== req.params.id) return res.status(400).json({errors: [{ msg: 'incorrect user id', param: '_id'}]});
    next();
  },

  upload.fields([{ name: 'profile_pic', maxCount: 1}, {name: 'banner_pic', maxCount: 1}]),

  ...nameAndUsernameValidators,

  body('description').isLength({ max: 200}).withMessage('must not exceed 200 characters'),

  async (req, res, next) => {
    try {
      let errors = validationResult(req).array();
      errors.push(...await checkUserDuplicatedFields(req, ['name', 'username'], req.userId));
      isFieldWithError = {};
      errors.map(err => {
        isFieldWithError[err.param] = true;
      });

      // update user (only update where fields don't have errors)
      let updatedUserFields = {};
      ['name', 'username', 'description'].forEach(field => {
        !isFieldWithError[field] && (updatedUserFields[field] = req.body[field]);
      });

      ['banner_pic', 'profile_pic'].forEach(imgField => {
        if (req.files[imgField]) {
          updatedUserFields[imgField] = '/uploads/banner_pic/' + req.files[imgField][0].filename;
          fs.unlinkSync(req.filenamesToDelete[imgField]);
        }
      });

      await User.findByIdAndUpdate(req.userId, updatedUserFields, {lean: true});
      
      return res.json({updatedUserFields, errors});

    } catch(e) {
      next(e);
    }
  }
];

module.exports.get_posts_from_user = [
  verifyToken(false),
  async (req, res, next) => {
    try {
      const paginatedResults = await getPaginatedResults({
        req,
        findOptions: { author: req.params.id },
        model: Post,
        name: 'posts',
        page: 1,
        sortOptions: {like_count: -1},
        limit: 10,
        populateField: 'author',
        selectPopulate: 'profile_pic name username'
      });

      // if there is no token, just return the paginated posts without like information
      // if the token is wrong (or expired), the verify token middleware sends a forbidden status
      if (!req.userId) return res.json(paginatedResults);

      // if there is a valid token, the like info is attached to every post
      await attach_liked_to_things(paginatedResults.posts, req.userId);

      return res.json(paginatedResults);

    } catch(err) {
      return next(err);
    }
  }
];

const get_followers_or_following_from_user = (findField, populateField) => [
  verifyToken(false),
  async (req, res, next) => {
    try {
      const paginatedResults = await getPaginatedResults({
        req,
        findOptions: { [findField]: req.params.id },
        model: Follow,
        name: 'users',
        page: 1,
        limit: 10,
        sortOptions: { follower_count: -1 },
        populateField: populateField,
        selectPopulate: '-__v -follower_count -password -email'
      });

      paginatedResults.users = paginatedResults.users.map(user => user[populateField]);

      if (!req.userId) return res.json(paginatedResults);

      await attach_followed_to_users(paginatedResults.users, req.userId);

      return res.json(paginatedResults);

    } catch(err) {
      return next(err);
    }
  }
];

module.exports.get_followers_from_user = get_followers_or_following_from_user('target_id', 'author_id');

module.exports.get_following_from_user = get_followers_or_following_from_user('author_id', 'target_id');

module.exports.get_comments_from_user = [
  verifyToken(false),
  async (req, res, next) => {
    try {
      const paginatedResults = await getPaginatedResults({
        req,
        findOptions: { author: req.params.id },
        model: Comment,
        name: 'comments',
        page: 1,
        limit: 10,
        selectFields: '-__v -parent_id',
        sortOptions: { like_count: -1 },
        populateField: 'post_id',
        selectPopulate: '-__v -body'
      });

      const postAuthors = await Promise.all(paginatedResults.comments.map(comment => {
        return User.findById(comment.post_id.author).select('profile_pic username').lean();
      }));

      postAuthors.forEach((postAuthor, i) => {
        const parentPost = paginatedResults.comments[i].post_id;
        parentPost.profile_pic = postAuthor.profile_pic;
        parentPost.username = postAuthor.username;
      });

      if (!req.userId) return res.json(paginatedResults);

      await attach_liked_to_things(paginatedResults.comments, req.userId);

      return res.json(paginatedResults);

    } catch(err) {
      return next(err);
    }
  }
];