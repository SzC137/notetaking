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
  
    body("noteCollectionParent")
      .optional({nullable: true}) //let null value go through
      .custom((id) => {
        //if it's null then go through directly, if not then verify whether it is a valid ObjectId
        return id === null || mongoose.Types.ObjectId.isValid(id);
      })
      .withMessage("Collection ID must be null or a valid ObjectId")
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
    const note = await Note.findById(req.params.id).lean();
  
    if (!note) {
      return res.status(204).json({ error: "Note not found" });
    }
  
    if (note.user.toString() !== req.user.user_id && !req.user.is_admin) {
      return res.status(403).json({ error: "You are not allowed to access this note." });
    }
  
    if (note.noteCollectionParent){
      const collection = await NoteCollection.findById(note.noteCollectionParent).lean();
      if (collection){
        note.collectionName = collection.name;
      }
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
  
      
      const collectionId = req.body.noteCollectionParent;

      //Check collection ownership
      if(collectionId){
        const collection = await NoteCollection.findById(collectionId);

        if (!collection){
          return res.status(400).json({error: "Collection not found"});
        }

        //if the requester is not admin, ensure the collection they assign notes to, belongs to them
        if (!req.user.is_admin && collection.user.toString() !== req.user.user_id){
          return res.status(403).json({error: "You cannot assign a note to another user's collection"})
        }

        //adding note ID into the notes array in collection
        const note = new Note({
          title: req.body.title,
          description: req.body.description,
          user: req.user.user_id,
          noteCollectionParent: collectionId
        });
  
        await note.save();

        //simultaneously update the noteCollection model, adding note ID into that notes array in the noteCollection model 
        collection.notes.push(note._id);
        await collection.save();

        return res.status(201).json(note);
      }

      //if there is no specific collection, we create a note directly
      const note = new Note({
        title: req.body.title,
        description: req.body.description,
        user: req.user.user_id,
        noteCollectionParent: null
      });

      await note.save();
      res.status(201).json(note);
      
    })
  ];

   
   exports.addNoteIntoCollection = asyncHandler(async (req, res) => {
    const {noteID, noteCollectionID} = req.body;  

    //checking whether note exists
    const note = await Note.findById(noteID);
    const collection = await NoteCollection.findById(noteCollectionID);

    if(!note){
      return res.status(404).json({error: "Note not found"});
    }

    //checking whether collection exists
    if(!collection){
      return res.status(404).json({error: "Collection not found"});
    }

    //permission check: you're only able to manipulate your notes unless you're admin
    if(
      (note.user.toString() !== req.user.user_id && !req.user.is_admin) ||
      (collection.user.toString() !== req.user.user_id && !req.user.is_admin)
    ){
      return res.status(403).json({error: "Permission denied"});
    }

    //if the note you're assigning already belonged to a collection, then you remove it in the old collection
    if (note.noteCollectionParent && note.noteCollectionParent !== noteCollectionID){
      const oldCollection = await NoteCollection.findById(note.noteCollectionParent);
      if(oldCollection){
        oldCollection.notes = oldCollection.notes.filter(
          (nId) => nId.toString() !== note._id.toString()
        );
        await oldCollection.save();
      }
    }

    //actually updating the noteCollectionParent field of a note
    note.noteCollectionParent = noteCollectionID;
    await note.save();

    //If at this point the the notes[] of the new collection haven't add the new note in, then add it
    if(!collection.notes.includes(note._id)){
      collection.notes.push(note._id);
      await collection.save();
    }

    res.status(200).json({message: "Note successfully assigned to collection:", 
      note:{
        id: note._id,
        title: note.title
      },
      collection:{
        id: collection._id,
        name: collection.name
      }
    });

    //   const noteID = req.body.noteID;
    //   const noteCollectionID = req.body.noteCollectionID;     
    //   console.log("noteID", noteID);
    //   console.log("noteCollectionID", noteCollectionID); 
  
  
    // const updatedObject = await NoteCollection.findOne({_id: noteCollectionID});
    //  updatedObject.notes.push(noteID);
    // await updatedObject.save();
    // return res.status(200).json(updatedObject);
  });

     /*   console.log(collection); // Array of documents where 'referencedField' matches
    
     
    if (!collection) {
      return res.status(204).json({ error: "Note not found" });
    }
    res.status(200).json(collection);
   });*/

  // DELETE a note
  exports.delete = asyncHandler(async (req, res) => {
    const note = await Note.findById(req.params.id);
  
    if (!note) {
      return res.status(204).json({ error: "Note not found" });
    }
  
    if (note.user.toString() !== req.user.user_id && !req.user.is_admin) {
      return res.status(403).json({ error: "You are not allowed to delete this note." });
    }
  
    //if that note you're deleting has a collection parent, the we remove that note in the notes[] of that collection
    if(note.noteCollectionParent){
      const collection = await NoteCollection.findById(note.noteCollectionParent);
      if(collection) {
        collection.notes = collection.notes.filter(
          (nId) => nId.toString() !== note._id.toString()
        );
        await collection.save();
      } 
    }

    //deleting the note itself
    await Note.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Note deleted successfully" });
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

      //check whether passed in a noteCollectionParent when updating
      const updateCollection = req.body.hasOwnProperty("noteCollectionParent");
      const newCollectionId = updateCollection ? req.body.noteCollectionParent : note.noteCollectionParent;
  
      //if updating the collection ID of a note, then we're checking it here
      if (updateCollection && newCollectionId){
        
        const Collection = await NoteCollection.findById(newCollectionId);  
        
        //finding that that collection whether exists or not
        if (!Collection){
          return res.status(400).json({error: "Collection not found"});
        }
        
        //if the requester is not admin, ensure the collection they assign notes to, belongs to them
        if (!req.user.is_admin && Collection.user.toString() !== req.user.user_id){
          return res.status(403).json({error: "You cannot assign a note to another user's collection."});
        }
      }
        
      //if need to just remove a note's collection, the we remove it from the old collection
      if(updateCollection && !newCollectionId && note.noteCollectionParent){
          const oldCollection = await NoteCollection.findById(note.noteCollectionParent);
          if(oldCollection){
            oldCollection.notes = oldCollection.notes.filter(
              (nId) => nId.toString() !== note._id.toString()
            );
            await oldCollection.save();
          }
      }
        
      //If we move a note from one collection to another collection, then we first remove the that note in the old collection, then we add that note into the new collection
      if(updateCollection && newCollectionId && newCollectionId !== note.noteCollectionParent){
        
        //remove first
        if (note.noteCollectionParent){
          const oldCollection = await NoteCollection.findById(note.noteCollectionParent);
          if(oldCollection){
            oldCollection.notes = oldCollection.notes.filter(
              (nId) => nId.toString() !== note._id.toString()
            );
            await oldCollection.save();
          }
        }

        //add in the note in new collection
        const newCollection = await NoteCollection.findById(newCollectionId);
        if(newCollection && !newCollection.notes.includes(note._id)){
          newCollection.notes.push(note._id);
          await newCollection.save();
        }
      }
      
      //actually updating the data of the note
      const updatedNote = await Note.findByIdAndUpdate(
        req.params.id,
        {
          $set: {
            title: req.body.title,
            description: req.body.description,
            noteCollectionParent: newCollectionId || null
          }
        },
        { new: true, runValidators: true }
      );
  
      res.status(200).json(updatedNote);
    })
  ];
