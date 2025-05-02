const mongoose = require("mongoose");

const noteCollectionSchema = new mongoose.Schema({
    name:{
        type: String,
        required: true,
    },
    description:{
        type: String,
        required: true,
    },
    user:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, {timestamps: true});

module.exports = mongoose.model("NoteCollection", noteCollectionSchema);