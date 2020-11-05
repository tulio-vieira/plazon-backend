var express = require('express');
var path = require('path');
var logger = require('morgan');

require("dotenv").config();

var app = express();

//Set up mongoose connection
var mongoose = require('mongoose');
mongoose.connect(process.env.DB_STRING, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false
});
var db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'build')));

// SETUP CORS
app.use(function (req, res, next) {
  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

  // Request headers you wish to allow
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader('Access-Control-Allow-Credentials', true);

  // Pass to next layer of middleware
  next();
});

//ROUTES CONFIGURATION
const authRouter = require('./routes/auth');
const userRouter = require('./routes/user');
const commentsRouter = require('./routes/comments');
const postsRouter = require('./routes/posts');

app.use('/api/', authRouter);
app.use('/api/users', userRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/posts', postsRouter);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const error = new Error("Not found");
  error.status = 404;
  next(error);
});

app.use((error, req, res, next) => {
  res.status(error.status || 500);
  if (req.app.get('env') === 'development') {
    console.log(error.message);
    console.log(error.status);
    console.log(error.stack);
  }
  if (error.message.includes('Cast to ObjectId')) error.message = 'DOCUMENT_NOT_FOUND';
  res.json({
    errors: [
      { msg: error.message }
    ]
  });
});

module.exports = app;
