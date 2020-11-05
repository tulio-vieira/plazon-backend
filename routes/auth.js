const express = require('express');
const router = express.Router();
const { protected_get, register_post, login_post } = require('../controllers/auth_controller');

// Index route
router.get('/', (req, res) => {
  res.json({msg: 'Welcome to the API'});
});

// Protected route
router.get('/protected', protected_get);

router.post('/register', register_post);

router.post('/login', login_post);

module.exports = router;