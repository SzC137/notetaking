const mongoose = require("mongoose");
const paginate = require("mongoose-paginate-v2");

const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  belongsToNoteCollection: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "NoteCollection"
  }]
}, { timestamps: true });

noteSchema.plugin(paginate);

module.exports = mongoose.model("Note", noteSchema);