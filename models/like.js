var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var LikeSchema = new Schema(
  {
    author_id: {type: Schema.Types.ObjectId, required: true}, // who liked/disliked
    target_id: {type: Schema.Types.ObjectId, required: true}, // the thing being liked/disliked. Can be a post or a comment
    value: {type: Boolean, required: true} // true means like and false means dislike
  }
);

//Export model
module.exports = mongoose.model('Like', LikeSchema);