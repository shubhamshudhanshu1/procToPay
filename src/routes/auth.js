const express = require("express");
const { register, login } = require("../controllers/authController");
const {
  validateRegister,
  validateLogin,
} = require("../middlewares/validation");

const router = express.Router();

// Auth routes
router.post("/register", validateRegister, register);
router.post("/login", validateLogin, login);

module.exports = router;
