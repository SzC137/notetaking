const express = require("express");
const controller = require("../controllers/note");

const validateMongoId = require("../middleware/validateMongoId");
const authenticateWithJwt = require("../middleware/authenticateWithJwt");
const validatePaginateQueryParams = require("../middleware/validatePaginateQueryParams");

const router = express.Router();

// List all notes and create note
router.route("/")
  .all(authenticateWithJwt)
  .get(validatePaginateQueryParams, controller.list)
  .post(controller.create)
  .put(controller.addNoteIntoCollection);

// Detail, update and delete specific note
router.route("/:id")
  .all(authenticateWithJwt)
  .all(validateMongoId("id"))
  .get(controller.detail)
  .put(controller.update)
  .delete(controller.delete);


    

module.exports = router;