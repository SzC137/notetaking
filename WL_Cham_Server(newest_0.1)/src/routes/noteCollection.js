const express = require("express");

const controller = require("../controllers/noteCollection");
const validateMongoId = require("../middleware/validateMongoId");
const authenticateWithJwt = require("../middleware/authenticateWithJwt");

const router = express.Router();

//this route is for getting all of the information of a note, that is within a specific note collection
router.route("/relatedNotes")
    .all(authenticateWithJwt)
    .get(controller.getRelatedNotes);

//The route for listing all collections, and create a new collection
router.route("/")
    .all(authenticateWithJwt)
    .get(controller.list)
    .post(controller.create);

//The route for getting, deleting, and updating a particular collection
router.route("/:id")
    .all(authenticateWithJwt)
    .all(validateMongoId('id'))
    .get(controller.detail)
    .put(controller.update)
    .delete(controller.delete);



module.exports = router;