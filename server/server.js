const express = require("express");
const mongoose = require("mongoose");
var fs = require('fs');
const cors = require("cors");
const morgan = require("morgan");
var path = require('path');
const rateLimit = require("express-rate-limit");

const indexRouter = require("./src/routes/index");

const app = express();

//setting up logger to save access logs
var accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), {flags: 'a'})
app.use(morgan('combined', {stream: accessLogStream}))
//------------------------

//MongoDB connection code block
const mongoDB = process.env.MONGODB_URI || "mongodb://localhost:27017/note-app";

main().catch((err) => console.log(err));
async function main(){
    await mongoose.connect(mongoDB);
}
//------------------------

//Application level middlewares
app.use(express.json());
app.use(express.urlencoded({extended:false}));
app.use(cors({
    exposedHeaders: ["Authorization","Link"],
    origin: "*"
}));

//Rate limiter middlerware
const authenticatedLimiter = rateLimit({
    windowMs: 1000, //1 second window
    max:10,         //limit each authenticated user to 10 requests per windowMs
    message: 'Too many requests, please try again later',
})

const nonAuthenticatedLimiter = rateLimit({
    windowMs: 1000, //1 second window
    max:5,         //limit each authenticated user to 5 requests per windowMs
    message: 'Too many requests, please try again later',
})

//Dummy check for applying different limiters
app.use((req, res, next) => {
    if(req.user){
        authenticatedLimiter(req, res, next);
    }else{
        nonAuthenticatedLimiter(req, res, next);
    }
});
//------------
//------------------------

//log incoming request paths
app.use((req, res, next) => {
    console.log(`Received request for route: ${req.originalUrl}`);
    next()
});
//------------------------

//Direct every /api requests to the /routes/index.js file
app.use("/api", indexRouter);
//------------------------

//Start my backend
const PORT = 4000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
//------------------------

module.exports = app;