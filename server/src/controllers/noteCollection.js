const mongoose = require("mongoose");
const NoteCollection = require("../models/noteCollection");
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
    const collection = await NoteCollection.findById(req.params.id);

    if (!collection){
        return res.status(204).json({error: "Collection not found"});
    }

    if (collection.user.toString() !== req.user.user_id && !req.user.is_admin){
        return res.status(403).json({error: "You don't have access to this collection."});
    }

    res.status(200).json(collection);
});


//Create a new collection
exports.create = [
    collectionValidator(),
    asyncHandler(async (req, res) =>{
        const errors = validationResult(req);
        if (!errors.isEmpty()){
            return res.status(400).json({errors:errors.array()});
        }

        const newCollection = new NoteCollection({
            name: req.body.name,
            description: req.body.description,
            user: req.user.user_id
        });

        await newCollection.save();
        res.status(201).json(newCollection);
    })
];


//Delete a collection
exports.delete = asyncHandler(async (req, res) => {
    const collection = await NoteCollection.findById(req.params.id);

    if(!collection){
        return res.status(204).json({error: "Collection not found" });
    }

    // if(collection.user.toString() !== req.user.user_id && !req.user.is_admin){
    //     return res.status(403).json({error: "You don't have permission to delete this collection."});
    // }
    if ((!collection.user || collection.user.toString() !== req.user.user_id) && !req.user.is_admin){
        return res.status(403).json({error: "You don't have permission to delete this collection."});
    }


    await NoteCollection.findByIdAndDelete(req.params.id);
    res.status(200).json({message: "Collection deleted"});
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

        const updated = await NoteCollection.findByIdAndUpdate(
            req.params.id,
            {
                $set:{
                    name: req.body.name,
                    description: req.body.description
                }
            },
            {new: true, runValidators: true}
        );

        res.status(200).json(updated);
    })
];
