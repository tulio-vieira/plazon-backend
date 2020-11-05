var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var UserSchema = new Schema(
    {
        email: { type: String, required: true, maxlength: 50 },
        name: { type: String, required: true, maxlength: 50 },
        username: { type: String, required: true, maxlength: 50 },
        password: { type: String, required: true },
        description: { type: String, required: false, maxlength: 200 },
        follower_count: { type: Number, default: 0 },
        date_created: { type: Date, default: Date.now },
        profile_pic: { type: String, required: false, maxlength: 1000, default: '/images/default-profile-picture.jpg' },
        banner_pic: { type: String, required: false, maxlength: 1000, default: '/images/default-banner.jpg' }
    }
);

//Export model
module.exports = mongoose.model('User', UserSchema);