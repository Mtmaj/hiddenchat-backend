const { Int32 } = require('mongodb');
const mongoose = require('mongoose')

const Schema = mongoose.Schema;

const userSchema = Schema(
    {
        username : String,
        password : String,
        fullname : String,
        socketlist : [String],
        grouplist : [Number]
    }
);

module.exports.UserModel = mongoose.model('user',userSchema,'user')