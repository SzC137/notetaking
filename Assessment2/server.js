const express = require("express");
const mongoose = require("mongoose");
var fs = require('fs');
const cors = require("cors");
const morgan = require("morgan");
var path = require('path');

const indexRouter = require("./src/routes/index");

const app = express();

var accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), {flags: 'a'})
//setting up logger
app.use(morgan('combined', {stream: accessLogStream}))

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
//app.use(cors());


//Haven't add in rate limiters yet, will do later
//------------------------


app.use((req, res, next) => {
    console.log(`Received request for route: ${req.originalUrl}`);
    next()
});

app.use("/api", indexRouter);

const PORT = 4000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;