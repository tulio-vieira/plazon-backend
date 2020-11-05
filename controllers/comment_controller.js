const Comment = require('../models/comment');
const Post = require('../models/post');
const { verifyToken, attach_liked_to_things } = require('./utils');

module.exports.get_comments_from_parent = async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;
    const depth = req.query.depth ? parseInt(req.query.depth) : 4;
    const startIndex = req.query.startIndex ? parseInt(req.query.startIndex) : 0;
    let startDepth = req.query.startDepth ? parseInt(req.query.startDepth) : 0;
    const withParent = req.query.withParent === 'true';
    if (withParent) startDepth++;

    let comments = [];
    let comment_layer;

    // find parent comment
    if (withParent) {
      const parent = await Comment.findById(req.params.id).populate('author', 'username profile_pic');
      if (!parent) throw new Error('DOCUMENT_NOT_FOUND');
      comments.push(parent);
    }

    for (let i = startDepth; i <= depth; i++ ) {
      comment_layer = await Comment.find({
        parent_id: i === startDepth ? req.params.id : { $in: comment_layer.map(comment => comment._id) },
      })
      .populate('author', 'username profile_pic')
      .sort({ like_count: -1 })
      .skip(i === startDepth ? startIndex : 0)
      .limit(limit)
      .lean({ virtuals: true });
      if (comment_layer.length === 0) break;
      comments.push(...comment_layer);
    }

    if (res.data) {
      res.data.comments = comments;
    } else { res.data = { comments }};

    if (!req.userId) return res.json(res.data);

    await attach_liked_to_things(res.data.comments, req.userId);

    return res.json(res.data);

  } catch (err) { return next(err); }
}

module.exports.create_comment = [
  verifyToken(),
  async (req, res, next) => {
    try {

      if (!req.body.parent_id || !req.body.post_id 
          || !req.body.body || req.body.length > 200) throw new Error('Invalid Request');

      // check if parent comment and/or parent post exist in the database
      const checkIds = await Promise.all([
        Post.exists({ _id: req.body.post_id }),
        (req.body.parent_id !== req.body.post_id) ? (Comment.findById(req.body.parent_id)).select('author').lean() : true
      ]);

      // if one of them doesn't exist throw error
      if (!checkIds[0] || !checkIds[1]) throw new Error('Parent or post not found');

      // check if user is not spamming a new thread.
      // to do that, a user is only allowed to comment on his own comment if his comment has been responded by someone else
      if (checkIds[1] !== true && checkIds[1].author.toString() === req.userId) {
        const check = await Comment.exists({parent_id: req.body.parent_id, author: { $ne: req.userId }});
        if (!check) return res.status(400).json({errors: [{ msg: 'You are doing that too much!'}]});
      }

      // Now that we know that the post and parentComment exist, increment comment_count of post
      // and num_children of parent comment, and create new Comment. Do all of these in parallel
      const tasks = await Promise.all([
        Post.findByIdAndUpdate(req.body.post_id, { $inc: { comment_count: 1 } }),
        (req.body.parent_id !== req.body.post_id) &&
          Comment.findByIdAndUpdate(req.body.parent_id, { $inc: { num_children: 1 } }),
        Comment.create({
          author: req.userId,
          body: req.body.body,
          post_id: req.body.post_id,
          parent_id: req.body.parent_id,
          depth: req.body.depth
        })
      ])
  
      const result = await Comment.findById(tasks[2]._id).populate('author', 'username profile_pic').lean({ virtuals: true });

      // return newly created comment
      return res.json(result);

    } catch(err) {
      return next(err);
    }
  }
];

module.exports.like_comment = (req, res) => {
  res.json(req.params.id);
}