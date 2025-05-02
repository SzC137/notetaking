const mongoose = require("mongoose");
const Note = require("../models/note");
const NoteCollection = require("../models/noteCollection");
const asyncHandler = require("express-async-handler");
const { body, query, validationResult } = require("express-validator");
const { generatePaginationLinks } = require("../utils/generatePaginationLinks");

// Validation rules for note
const noteValidator = () => [
    body("title")
      .notEmpty().withMessage("Title is required")
      .isString().withMessage("Title must be a string"),
  
    body("description")
      .notEmpty().withMessage("Description is required")
      .isString().withMessage("Description must be a string"),
  
    body("belongsToNoteCollection")
      .optional()
      .custom((id) => mongoose.Types.ObjectId.isValid(id))
      .withMessage("Each collection ID must be valid")
  ];
  
  // GET all notes (with optional query filter)
  exports.list = [
    query("title").optional().trim(),
  
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
  
      const title = req.query.title || "";
      const filters = req.user.is_admin
        ? { title: new RegExp(title, "i") }
        : { title: new RegExp(title, "i"), user: req.user.user_id };
  
      const notesPage = await Note
        .find(filters)
        .sort({ createdAt: "desc" })
        .lean()
        .paginate({
          ...req.paginate,
          populate: {
            path: "belongsToNoteCollection",
            select: "name"
          }
        });
  
      res
        .status(200)
        .links(generatePaginationLinks(
          req.originalUrl,
          req.paginate.page,
          notesPage.totalPages,
          req.paginate.limit
        ))
        .json(notesPage.docs);
    })
  ];
  
  // GET a specific note
  exports.detail = asyncHandler(async (req, res) => {
    const note = await Note.findById(req.params.id).populate("belongsToNoteCollection");
  
    if (!note) {
      return res.status(204).json({ error: "Note not found" });
    }
  
    if (note.user.toString() !== req.user.user_id && !req.user.is_admin) {
      return res.status(403).json({ error: "You are not allowed to access this note." });
    }
  
    res.status(200).json(note);
  });
  
  // CREATE a new note
  exports.create = [
    noteValidator(),
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
  
      //Check collection ownership
      if(req.body.belongsToNoteCollection){
        const collection = await NoteCollection.findById(req.body.belongsToNoteCollection);

        if (!collection){
          return res.status(400).json({error: "Collection not found"});
        }

        //if the requester is not admin, ensure the collection they assign notes to, belongs to them
        if (!req.user.is_admin && collection.user.toString() !== req.user.user_id){
          return res.status(403).json({error: "You cannot assign a note to another user's collection"})
        }
      }

      const note = new Note({
        title: req.body.title,
        description: req.body.description,
        user: req.user.user_id,
        belongsToNoteCollection: req.body.belongsToNoteCollection || null
      });
  
      await note.save();
      res.status(201).json(note);
    })
  ];
  
  // DELETE a note
  exports.delete = asyncHandler(async (req, res) => {
    const note = await Note.findById(req.params.id);
  
    if (!note) {
      return res.status(204).json({ error: "Note not found" });
    }
  
    if (note.user.toString() !== req.user.user_id && !req.user.is_admin) {
      return res.status(403).json({ error: "You are not allowed to delete this note." });
    }
  
    await Note.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Note deleted" });
  });
  
  // UPDATE a note
  exports.update = [
    noteValidator(),
    asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
  
      const note = await Note.findById(req.params.id);
      if (!note) {
        return res.status(204).json({ error: "Note not found" });
      }
  
      //role-based access for updating notes, can't update other user's notes unless you're admin
      if (note.user.toString() !== req.user.user_id && !req.user.is_admin) {
        return res.status(403).json({ error: "You are not allowed to update this note." });
      }
  
      //role-based access for updating collections, can't assign notes to other user's collection unless you're admin
      if (req.body.belongsToNoteCollection){
        const collection = await NoteCollection.findById(req.body.belongsToNoteCollection);

        if (!collection){
          return res.status(400).json({error: "Collection not found"});
        }

        ////if the requester is not admin, ensure the collection they assign notes to, belongs to them
        if (!req.user.is_admin && collection.user.toString() !== req.user.user_id){
          return res.status(403).json({error: "You cannot assign a note to another user's collection."})
        }
      }

      const updatedNote = await Note.findByIdAndUpdate(
        req.params.id,
        {
          $set: {
            title: req.body.title,
            description: req.body.description,
            belongsToNoteCollection: req.body.belongsToNoteCollection || null
          }
        },
        { new: true, runValidators: true }
      );
  
      res.status(200).json(updatedNote);
    })
  ];
  