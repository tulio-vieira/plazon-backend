const mongoose = require('mongoose');
const moment = require('moment');
const mongooseLeanVirtuals = require('mongoose-lean-virtuals');

var Schema = mongoose.Schema;

const PostSchema = new mongoose.Schema(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, maxlength: 1000 },
    body: { type: String, maxlength: 1000 },
    like_count: { type: Number, default: 0 },
    dislike_count: { type: Number, default: 0 },
    comment_count: { type: Number, default: 0 },
    contentUrl: { type: String, maxlength: 1000 },
    isVideo: { type: Boolean, default: false },
    date_created: { type: Date, default: Date.now }
  },
  { toJSON: { virtuals: true }, id: false }
);

// Virtual for formatted date
PostSchema
.virtual('date_formatted')
.get(function () {
    if ((Date.now() - this.date_created) < 86400000) {
      return moment(this.date_created).fromNow();
    }
    return moment(this.date_created).calendar();
});

PostSchema.plugin(mongooseLeanVirtuals);

module.exports = mongoose.model('Post', PostSchema);
