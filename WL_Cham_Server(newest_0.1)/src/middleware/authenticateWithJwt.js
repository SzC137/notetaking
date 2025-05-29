require("dotenv").config();
const jwt = require("jsonwebtoken");

const authenticateWithJwt = (req, res, next) => {
    //using a Bearer authentication here. The token is in the authorization header.
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(' ')[1];

    //if the token doesn't exist then respond "Unauthorized" json response
    if(!token){
        return res.status(401).json({error:"Unauthorized"});
    }

    //checking whether token is valid
    try{
        //here we're putting the user id into this variable
        const user = jwt.verify(token, process.env.JWT_SECRET);

        //And then put the user info into the request object for the next handler
        req.user = user;
        next();
    }catch(err){
        console.log(
            `JWT verification failed at URL ${req.url}`,
            err.name,
            err.message
        );
        return res.status(401).json({error: "Invalid token"});
    }

};

module.exports = authenticateWithJwt;
