const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const authorizeRole = require("../middleware/authorizeRole");
const equipment = require("../controllers/equipmentController");

// Authenticated users can browse the equipment catalogue.
router.use(authenticate);
router.get("/", equipment.listEquipment);
router.get("/:id", equipment.getEquipmentById);

// Equipment management is restricted to administrators.
router.post("/", authorizeRole("admin"), equipment.createEquipment);
router.put("/:id", authorizeRole("admin"), equipment.updateEquipment);
router.patch("/:id/status", authorizeRole("admin"), equipment.updateEquipmentStatus);
router.delete("/:id", authorizeRole("admin"), equipment.deleteEquipment);

module.exports = router;
