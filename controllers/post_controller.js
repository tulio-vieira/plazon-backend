const Comment = require('../models/comment');
const Like = require('../models/like');
const Post = require('../models/post');
const { get_comments_from_parent } = require('./comment_controller');
const { verifyToken, attach_liked_to_things, getPaginatedResults } = require('./utils');

module.exports.get_posts = [
  verifyToken(false),
  async (req, res, next) => {
    try {
      const paginatedResults = await getPaginatedResults({
        req,
        model: Post,
        name: 'posts',
        page: 1,
        findOptions: req.query.search ? { $or:[
          {title: {$regex: req.query.search, $options: 'i'}},
          {body: {$regex: req.query.search, $options: 'i'}}
        ]} : null,
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

module.exports.get_post = [
  verifyToken(false),
  async (req, res, next) => {
    try {
      let results = await Promise.all([
        Post.findById(req.params.id).populate('author', 'profile_pic name username').lean({ virtuals: true }),
        req.userId ? Like.findOne({author_id: req.userId, target_id: req.params.id}).select('value -_id').lean() : null,
        Comment.countDocuments({ parent_id: req.params.id })
      ]);
      if (!results[0]) throw new Error('DOCUMENT_NOT_FOUND');
      results[0].liked = results[1] ? (results[1].value ? 1 : -1) : 0;
      res.data = {};
      res.data.post = results[0];
      res.data.post.num_children = results[2] || 0;
      if (req.query.withComments === 'false') return res.json(res.data);
      return next();
    } catch(err) {
      err.status = 400;
      return next(err);
    }
  },
  get_comments_from_parent
]

module.exports.create_post = [
  verifyToken(),
  async (req, res, next) => {
    try {
      if (!req.body.title) return res.status(400).json({errors: [{msg: 'Invalid Request'}]});
      const newLineCount = (req.body.body.match(/\n/g) || []).length;
      if (newLineCount > 6) return res.status(400).json({errors: [{msg: 'Too many new lines'}]});
      const newPost = await Post.create({
        author: req.userId,
        body: req.body.body,
        title: req.body.title,
        isVideo: req.body.isVideo,
        contentUrl: req.body.contentUrl
      });
      return res.json(newPost);
    } catch(err) {
      return next(err);
    }
  }
];