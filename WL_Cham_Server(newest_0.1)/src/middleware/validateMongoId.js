//This is the middleware for validating MongoDB ObjectID
//@param {string} paramName, this is the request parameter to validate
const mongoose = require('mongoose');

const validateMongoId = (paramName) => {
    return (req, res, next) => {
        const id = req.params[paramName];
        if (!mongoose.Types.ObjectId.isValid(id)){
            return res.status(400).json({error: 'Invalid MongoDB ObjectID'})
        }
        next();
    };
};

module.exports = validateMongoId;