const express = require("express");

const controller = require("../controllers/noteCollection");
const validateMongoId = require("../middleware/validateMongoId");
const authenticateWithJwt = require("../middleware/authenticateWithJwt");

const router = express.Router();

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