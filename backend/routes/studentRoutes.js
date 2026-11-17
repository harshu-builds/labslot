const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const authorizeRole = require("../middleware/authorizeRole");
const students = require("../controllers/studentController");

router.use(authenticate);

// A student can read and update their own profile.
router.get("/me", (req, res, next) => {
  req.params.id = req.user.uid;
  next();
}, students.getStudentById);

router.put("/me", (req, res, next) => {
  req.params.id = req.user.uid;
  next();
}, students.updateStudent);

// Only administrators can view and update the student directory.
router.get("/", authorizeRole("admin"), students.listStudents);
router.get("/:id", authorizeRole("admin"), students.getStudentById);
router.put("/:id", authorizeRole("admin"), students.updateStudent);

module.exports = router;
