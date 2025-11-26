const express = require('express');
// Note: auth.ts was deleted - use authRoutes.ts instead
// const authRoutes = require("./auth");
const userRoutes = require('./users');
const cacheRoutes = require('./cache');

const router = express.Router();

// Mount route modules
// router.use("/auth", authRoutes); // Use authRoutes.ts instead
router.use('/users', userRoutes);
router.use('/cache', cacheRoutes);

module.exports = router;
