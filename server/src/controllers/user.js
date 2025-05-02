const asyncHandler = require("express-async-handler");
const User = require("../models/user");
const Note = require("../models/note");
const NoteCollection = require("../models/noteCollection");
const {body, validationResult} = require("express-validator");

//Get all users, but only allowed to admins
exports.getAllUsers = asyncHandler(async(req,res) => {
    if (!req.user.is_admin){
        return res.status(403).json({error: "Only admins can view all users."});
    }

    const users = await User.find().select("-password");
    res.status(200).json(users);
});


//Get my own info, GET /users/:id
exports.getProfile = asyncHandler(async (req,res)=> {
    const targetUserId = req.params.id;

    if(!req.user.is_admin && req.user.user_id !== targetUserId){
        return res.status(403).json({error: "You are not allowed to view this profile."});
    }

    const user = await User.findById(targetUserId).select("-password");
    if(!user) return res.status(404).json({error: "User note found"});

    res.status(200).json(user);
});


//Update my own info, PUT /users/:id
exports.updateProfile = [
    body("username").optional().isString().notEmpty(),
    body("password").optional().isString().isLength({min: 4}).withMessage("Password must be at least 4 characters long"),

    asyncHandler(async (req, res) => {
        const targetUserId = req.params.id;

        if (!req.user.is_admin && req.user.user_id !== targetUserId){
            return res.status(403).json({error: "You are not allowed to update this profile."});
        }

        const errors = validationResult(req);
        if(!errors.isEmpty())
            return res.status(400).json({errors: errors.array()});

        const user = await User.findById(targetUserId);
        if(!user) return res.status(404).json({error: "User not found"});

        if(req.body.username) user.username = req.body.username;
        if(req.body.password) user.password = req.body.password;

        await user.save();
        res.status(200).json({message: "User updated successfully"});
    }),
];


//Delete my account, and every note and collection I've created, DELETE /users/me
exports.deleteProfile = asyncHandler(async(req,res) => {
    const targetUserId = req.params.id;

    if(!req.user.is_admin && req.user.user_id !== targetUserId){
        return res.status(403).json({error: "You are not allowed to delete this account."});
    }

    const user = await User.findById(targetUserId);
    if(!user) {
        return res.status(404).json({error:"User not found"});
    }

    //Declaring a new variable for the extra log later, and to delete user's notes
    const deletedNotes = await Note.deleteMany({user: targetUserId});
    
    //Declaring a new variable for the extra log later, and to delete the user's collections
    const deletedCollections = await NoteCollection.deleteMany({user: targetUserId});

    //Delete the user
    await User.findByIdAndDelete(targetUserId);
    

    res.status(200).json({
        message:"Account deleted successfully",
        deletedNotes: deletedNotes.deletedCount,
        deletedCollections: deletedCollections.deletedCount
    });
});