var express = require('express');
const Comment = require('../models/comment');
const { get_comments_from_parent, create_comment } = require('../controllers/comment_controller');
const { like_thing, verifyToken } = require('../controllers/utils');
var router = express.Router();

router.get('/:id', verifyToken(false), get_comments_from_parent);

router.post('/', create_comment);

router.post('/:id', like_thing(Comment));

module.exports = router;