var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var FollowSchema = new Schema(
  {
    author_id: {type: Schema.Types.ObjectId, ref: 'User', required: true}, // who follows
    target_id: {type: Schema.Types.ObjectId, ref: 'User', required: true} // the user being followed.
  }
);

//Export model
module.exports = mongoose.model('Follow', FollowSchema);