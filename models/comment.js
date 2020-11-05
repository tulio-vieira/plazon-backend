const mongoose = require('mongoose');
const moment = require('moment');
const mongooseLeanVirtuals = require('mongoose-lean-virtuals');

const Schema = mongoose.Schema;

const CommentSchema = new Schema(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, maxlength: 1000 },
    parent_id: { type: Schema.Types.ObjectId, required: true },
    post_id: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    depth: { type: Number, required: true },
    num_children: { type: Number, default: 0 },
    like_count: { type: Number, default: 0 },
    dislike_count: { type: Number, default: 0 },
    date_created: { type: Date, default: Date.now }
  },
  { toJSON: { virtuals: true }, id: false }
);

// Virtual for formatted date
CommentSchema
.virtual('date_formatted')
.get(function () {
    if ((Date.now() - this.date_created) < 86400000) {
      return moment(this.date_created).fromNow();
    }
    return moment(this.date_created).calendar();
});

CommentSchema.plugin(mongooseLeanVirtuals);

//Export model
module.exports = mongoose.model('Comment', CommentSchema);