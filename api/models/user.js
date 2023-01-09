var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const config = require('./../../config');
var UserModel = new Schema({
    name: {
        type: String,
        trim: true
    },
    numeric_id: {
        type: String,
        required: true
    },
    profilepic: {
        type: String,
        trim: true
    },
    token: {
        type: String,
        required: true
    }
});

var User = mongoose.model('User', UserModel);

module.exports = {
    User
};
