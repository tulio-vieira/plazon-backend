const glob = require("glob");
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const { randomString } = require("./utils");


// attach filenames to delete to the req object, with the key 'filenamesToDelete'.
// Check if the key already exists. If so, just push the results to the array, instead of creating a new one
// after the multer upload middeware, check if profile_pic or banner_pic has been saved.
// If so, run fs.unlinkSync on each of the filenamesToDelete array's elements.
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, './public/uploads/' + file.fieldname);
  },
  filename: (req, file, cb) => {
    try {
      // check if there are any files that start with the user id (this prevents the user from storing multiple images)
      // don't forget the wildcard at the end
      checkPath = path.join(__dirname, `../public/uploads/${file.fieldname}/${req.userId}*`);
      // save filenamesToDelete under the req object. If the image upload is successful, the next middleware
      // after multer will delete the files
      if (!req.filenamesToDelete) req.filenamesToDelete = {};
      req.filenamesToDelete[file.fieldname] = glob.sync(checkPath)[0];

      // get file extension from original filename
      let ext = file.originalname.split('.');
      ext = ext[ext.length - 1];
      // the filename has a ramdom string at the end, so that its name always changes.
      // this is necessary because the browser will not make a new request for the image if the name is the same
      let filename = (req.userId || Date.now()) + randomString() + '.' + ext;
      cb(null, filename);
    } catch(err) {
      cb(err);
    }
  }
});

const fileFilter = (req, file, cb) => {
  // reject a file
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

module.exports.upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 2 },
  onError : function(err, next) {
    console.log('error', err);
    next(err);
  },
  fileFilter: fileFilter
});