require("dotenv").config();
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../models/user");

exports.register = asyncHandler(async (req, res) => {
    const { username, password, is_admin } = req.body;

    //Checking if username already exists
    const existingUser = await User.findOne({username});
    if (existingUser){
        return res.status(400).json({error: "Username is already taken"});
    }

    //If not pre-existing, create a new user here with three fields for you to enter
    const user = new User({username, password, is_admin});
    await user.save();
    res.status(201).json({message: "User registered successfully!"});
});

exports.login = asyncHandler(async (req, res) => {
    const {username, password} = req.body;

    //when the user is logging in, if there's no username or password provided, return 401 status code and a json object message
    const user = await User.findOne({username});
    if(!user || !(await user.comparePassword(password))){
        return res.status(401).json({error: "Invalid credentials"});
    }

    //if the user provided correct username and password, sign a token which contains user id, is_admin status
    const token = jwt.sign(
        {
            user_id: user._id,
            username: user.username, 
            is_admin: user.is_admin
        },
        process.env.JWT_SECRET,
        {expiresIn: "1h"}
    );

    res.json({token});
});


