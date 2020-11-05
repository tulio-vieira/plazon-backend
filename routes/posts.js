var express = require('express');
var router = express.Router();
const { get_posts, get_post, create_post } = require('../controllers/post_controller');
const { like_thing } = require('../controllers/utils');
const Post = require('../models/post');

// get list of all posts
router.get('/', get_posts);

// create new post
router.post('/', create_post);

// get post detail
router.get('/:id', get_post);

// like/dislike post
router.post('/:id', like_thing(Post));

module.exports = router;