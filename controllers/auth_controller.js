const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const { nameAndUsernameValidators, checkUserDuplicatedFields, verifyToken } = require('./utils');

module.exports.protected_get = [
  verifyToken(),
  (req, res) => {
    res.json({
      msg: 'You reached the protected route!',
      _id: req.userId
    });
  }
];

module.exports.register_post = [

  // FORM VALIDATION
  ...nameAndUsernameValidators,
  
  body('email').normalizeEmail().isEmail().withMessage('invalid e-mail')
  .isLength({ min: 1, max: 200}).withMessage('must not exceed 200 characters'),

  body('password').isLength({ min: 1, max: 200}).withMessage('must not be empty or exceed 200 characters'),

  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const duplicationErrors = await checkUserDuplicatedFields(req, ['name', 'username', 'email']);
      if (duplicationErrors.length > 0) return res.status(400).json({errors: duplicationErrors});

      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      const newUser = await new User({
        name: req.body.name,
        username: req.body.username,
        email: req.body.email,
        password: hashedPassword
      }).save();
      
      return res.json({msg: 'user successfully registered', user: {
        _id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        username: newUser.username,
        date_created: newUser.date_created
      }});

    } catch(e) {
      return next(e);
    }
  }
];

module.exports.login_post = async (req, res, next) => {
  if(!req.body.email || !req.body.password) return res.status(400).json({errors: [{ msg: 'empty fields'}]});
  
  try{
    let user = await User.findOne({ email: req.body.email }).select('-__v -following -comments_liked -posts_liked').lean();
    if (!user) return res.status(400).json({errors: [{ msg: 'email not found', param: 'email'}]});
    const isValid = await bcrypt.compare(req.body.password, user.password);

    if (isValid) {
        delete user.password;
        const token = jwt.sign({_id: user._id}, process.env.JWT_KEY, { expiresIn: '1h' })
        return res.json({ token, expiresIn: 3600, user });
    } else {
        return res.status(400).json({errors: [{ msg: 'incorrect password', param: 'password'}]});
    }
  } catch(e) {
    return next(e);
  }
}