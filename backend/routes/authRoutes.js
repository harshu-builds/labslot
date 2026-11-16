
const express = require("express");
const router = express.Router();

const {
  registerStudent,
  getCurrentUser
} = require("../controllers/authController");

const authenticate = require("../middleware/authenticate");

router.post("/register", registerStudent);

router.get("/me", authenticate, getCurrentUser);

module.exports = router;
