const express = require("express");
const authRoutes = require("./auth");
const userRoutes = require("./users");
const cacheRoutes = require("./cache");

const router = express.Router();

// Mount route modules
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/cache", cacheRoutes);

module.exports = router;
