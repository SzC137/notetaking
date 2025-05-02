const express = require("express");

const AuthenticationRouter = require("./auth");
const NoteRouter = require("./note");
const NoteCollectionRouter = require("./noteCollection");
const UserRouter = require("./user");

const router = express.Router();

router.use('/auth', AuthenticationRouter);
router.use("/notes", NoteRouter);
router.use("/collections", NoteCollectionRouter);
router.use("/users", UserRouter);

module.exports = router;