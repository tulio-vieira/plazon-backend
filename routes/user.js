const express = require('express');
const router = express.Router();
const {
  get_user,
  get_users,
  update_user,
  follow_user,
  get_posts_from_user,
  get_comments_from_user,
  get_followers_from_user,
  get_following_from_user } = require('../controllers/user_controller');


// get paginated list of users (not garded)
router.get('/', get_users);

// get info about a user (not garded)
router.get('/:id', get_user);

router.get('/:id/posts', get_posts_from_user);

router.get('/:id/comments', get_comments_from_user);

router.get('/:id/followers', get_followers_from_user);

router.get('/:id/following', get_following_from_user);

// follow/unfollow user (garded)
router.post('/:id', follow_user);

// update user (garded)
router.post('/:id/edit', update_user);



module.exports = router;