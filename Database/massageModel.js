const mongoose = require('mongoose')

const massageSchema = mongoose.Schema(
    {
        text : String,
        from : String,
        to : Number,
        time : Date,
        replay : String,
        id : String
    }
)

module.exports.MassageModel = mongoose.model('massages',massageSchema,'massages')