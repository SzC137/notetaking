const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password:{
        type: String,
        required: true,
    },
    is_admin:{
        type: Boolean,
        required: true,
        default: false
    }
});

//Hashing password before it got saved
userSchema.pre("save", {document: true, query:false}, async function (next){
    if (!this.isModified("password")) return next();
    try{
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    }catch(err){
        next(err);
    }
});

//Comparing entered password with hashed password
userSchema.methods.comparePassword = function (candidatePassword){
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
