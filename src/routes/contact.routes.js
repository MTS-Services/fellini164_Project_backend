const express = require("express");
const router = express.Router();
const contactController = require("../controllers/contactController");
const { protect, authorize } = require("../middleware/auth");
const {
  submitContactValidator,
  idValidator,
  validate,
} = require("../middleware/validator");

// Public — submit contact form
router.post(
  "/",
  submitContactValidator,
  validate,
  contactController.submitContact,
);

// Admin — contact submissions
router.get(
  "/admin",
  protect,
  authorize("ADMIN", "SUPER_ADMIN"),
  contactController.getAllContacts,
);
router.get(
  "/admin/:id",
  protect,
  authorize("ADMIN", "SUPER_ADMIN"),
  idValidator,
  validate,
  contactController.getContactById,
);
router.delete(
  "/admin/:id",
  protect,
  authorize("ADMIN", "SUPER_ADMIN"),
  idValidator,
  validate,
  contactController.deleteContact,
);

module.exports = router;
