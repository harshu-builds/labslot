const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const authorizeRole = require("../middleware/authorizeRole");
const bookings = require("../controllers/bookingController");

router.use(authenticate);
router.post("/", authorizeRole("student"), bookings.createBooking);
router.get("/mine", authorizeRole("student"), bookings.listMyBookings);
router.patch("/:id/cancel", authorizeRole("student"), bookings.cancelMyBooking);
router.get("/", authorizeRole("admin"), bookings.listBookings);
router.patch("/:id/status", authorizeRole("admin"), bookings.updateBookingStatus);

module.exports = router;
