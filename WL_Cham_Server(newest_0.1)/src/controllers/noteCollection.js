const mongoose = require("mongoose");
const NoteCollection = require("../models/noteCollection");
const Note = require("../models/note");
const asyncHandler = require("express-async-handler");
const {body, query, validationResult} = require("express-validator");

//Validation middleware
const collectionValidator = () => {
    return [
        body("name")
            .notEmpty().withMessage("Collection name is required")
            .isString().withMessage("Collection name must be a string"),

        body("description")
            .notEmpty().withMessage("Collection description is required")
            .isString().withMessage("Collection description must be a string")
    ];
};

//GET all collections
exports.list = asyncHandler(async (req, res) => {
    let collections;
    if (req.user.is_admin){
        collections = await NoteCollection.find().sort({name:"asc"});
    }else{
        collections = await NoteCollection.find({user: req.user.user_id}).sort({name: "asc"});
    }
    res.status(200).json(collections);
})


//Get a specific collection
exports.detail = asyncHandler(async (req, res) => {
    const collection = await NoteCollection.findById(req.params.id)
        .populate({
            path:"notes",
            select:"title"//only displaying the name and ID of a note
        });

    if (!collection){
        return res.status(204).json({error: "Collection not found"});
    }

    if (collection.user.toString() !== req.user.user_id && !req.user.is_admin){
        return res.status(403).json({error: "You don't have access to this collection."});
    }

    res.status(200).json(collection);
});


exports.getRelatedNotes = asyncHandler(async (req, res) => {
    try {
        const collection = await NoteCollection.findOne({_id: req.body.noteCollectionID}).populate("notes");

        if (!collection){
            return res.status(204).json({error: "Collection not found"});
        }

        if (collection.user.toString() !== req.user.user_id && !req.user.is_admin){
            return res.status(403).json({error: "You don't have access to this collection."});
        }

        res.status(200).json(collection.notes);
    } catch (error) {
        console.error("Error fetching related notes:", error);
        res.status(500).json({error: "Internal server error"});
    }
});


//Create a new collection
exports.create = [
    collectionValidator(),
    asyncHandler(async (req, res) =>{
        const errors = validationResult(req);
        if (!errors.isEmpty()){
            return res.status(400).json({errors:errors.array()});
        }

        const {name, description, notes = [] } = req.body;

        //驗證notes ID 格式
        for (let noteId of notes){
            if(!mongoose.Types.ObjectId.isValid(noteId)){
                return res.status(400).json({error: `Invalid Note ID: ${noteId}`});
            }
        }

        // 篩選出屬於當前使用者的 notes
        const validNotes = await Note.find({
            _id: { $in: notes },
            ...(req.user.is_admin ? {} : { user: req.user.user_id })
        });

        // 如果有 notes 傳入但找不到任何有效的 note，報錯
        if (notes.length > 0 && validNotes.length === 0){
            return res.status(403).json({error: "No valid notes to add."});
        }

        const validNoteIds = validNotes.map(n => n._id);

        //create collection
        const newCollection = new NoteCollection({
            name: req.body.name,
            description: req.body.description,
            user: req.user.user_id,
            notes: validNoteIds
        });

        await newCollection.save();

        //update the noteCollectionParent field of notes
        await Note.updateMany(
            {_id: {$in: validNoteIds}},
            {$set: {noteCollectionParent: newCollection._id.toString()}}
        );

        //回傳最新 collection 資料（可選擇 populate）
        const populated = await NoteCollection.findById(newCollection._id).populate("notes", "title");

        res.status(201).json({
            message: "Collection created and notes linked",
            collection: populated
        });
    })
];


//Delete a collection
exports.delete = asyncHandler(async (req, res) => {
    const collection = await NoteCollection.findById(req.params.id);

    if(!collection){
        return res.status(204).json({error: "Collection not found" });
    }

    //role based access: you can only delete your own collection unless you're admin
    if ((!collection.user || collection.user.toString() !== req.user.user_id) && !req.user.is_admin){
        return res.status(403).json({error: "You don't have permission to delete this collection."});
    }

    
    //update the noteCollectionParent field of every note to null when deleting this collection
    await Note.updateMany(
        {noteCollectionParent: collection._id.toString()},
        {$set: {noteCollectionParent: null}}
    );

    //then deleting this collection
    await NoteCollection.findByIdAndDelete(req.params.id);
    res.status(200).json({message: "Collection deleted and notes disassociated."});
});

//Update a collection
exports.update = [
    collectionValidator(),
    asyncHandler(async (req, res) =>{
        const errors = validationResult(req);
        if (!errors.isEmpty()){
            return res.status(400).json({errors: errors.array()});
        }

        const collection = await NoteCollection.findById(req.params.id);
        if (!collection){
            return res.status(204).json({error: "Collection not found"});
        }

        if (collection.user.toString() !== req.user.user_id && !req.user.is_admin){
            return res.status(403).json({error: "You don't have permission to update this collection."})
        }

        //if need to update the notes field
        let validNoteIds = [];
        if (req.body.notes && Array.isArray(req.body.notes)){
            //only choosing notes that has valid ObjectId
            const candidateNotes = await Note.find({_id: {$in: req.body.notes}});
            
            if(!req.user.is_admin){
                //filter out the notes only belongs to this user
                validNoteIds = candidateNotes
                    .filter(note => note.user.toString() === req.user.user_id)
                    .map(note => note._id.toString());
            }else{
                //admin
                validNoteIds = candidateNotes.map(note => note._id.toString())
            }
            
            //第一步：先清空目前已經綁定這個 Collection 的 notes
            await Note.updateMany(
                {noteCollectionParent: collection._id.toString()},
                {$set: {noteCollectionParent: null}}
            );

            //updating the noteCollectionParent field of these notes to this collection
            await Note.updateMany(
                {_id: {$in: validNoteIds}},
                {$set: {noteCollectionParent: collection._id.toString()}}
            );
        }

        //updating fields for the collection itself
        const updated = await NoteCollection.findByIdAndUpdate(
            req.params.id,
            {
                $set:{
                    name: req.body.name,
                    description: req.body.description,
                    ...(req.body.notes ? {notes: validNoteIds} : {})
                }
            },
            {new: true, runValidators: true}
        );

        res.status(200).json(updated);
    })
];
