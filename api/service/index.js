
var ObjectId = require('mongoose').Types.ObjectId;
var jwt = require('jsonwebtoken');
var config = require('./../../config'); 

module.exports = {
    response: function(status, message, data) {
        return {
            status: status,
            message: message,
            data: data
        };
    },

    validateObjectId: function(id) {
        if (ObjectId.isValid(id)) {
            var obj = new ObjectId(id);
            if (obj == id) {
                return true;
            }
        }
        return false;
    },

    randomNumber: async function(length) {
        return Math.floor(
            Math.pow(10, length - 1) + Math.random() * (Math.pow(10, length) - Math.pow(10, length - 1) - 1)
        );
    },
    issueToken: function (data) {
        console.log(typeof(data))
        if( typeof(data) != 'object') data = JSON.parse(data);
        return jwt.sign(data, config.apiSecret, {expiresIn: 604800});
    },
};
