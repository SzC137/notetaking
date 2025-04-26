const express = require("express");

const AuthenticationRouter = require("./auth");
const NoteRouter = require("./note");

const router = express.Router();

router.use('/auth', AuthenticationRouter);
router.use("/notes", NoteRouter);

module.exports = router;