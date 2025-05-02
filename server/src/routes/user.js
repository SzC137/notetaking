const express = require("express");
const controller = require("../controllers/user");
const authenticateWithJwt = require("../middleware/authenticateWithJwt");
const validateMongoId = require("../middleware/validateMongoId");

const router = express.Router();

router.route("/")
    .all(authenticateWithJwt)
    .get(controller.getAllUsers);

router.route("/:id")
    .all(authenticateWithJwt)
    .all(validateMongoId("id"))
    .get(controller.getProfile)
    .put(controller.updateProfile)
    .delete(controller.deleteProfile);

module.exports = router;