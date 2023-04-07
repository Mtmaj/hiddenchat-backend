const mongoose = require('mongoose')

const GroupSchema = mongoose.Schema({
    groupname : String,
    groupid : Number,
    grouppassword: String,
    users : [String]
});

module.exports.GroupModel = mongoose.model('group',GroupSchema,'group')