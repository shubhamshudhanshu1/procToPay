const express = require("express");
const { getProfile, updateProfile } = require("../controllers/userController");
const { authenticateToken } = require("../middlewares/auth");

const router = express.Router();

// User routes (protected)
router.get("/profile", authenticateToken, getProfile);
router.put("/profile", authenticateToken, updateProfile);

module.exports = router;
