const express = require("express");
const cacheController = require("../controllers/cacheController");

const router = express.Router();

// Cache management routes
router.get("/stats", cacheController.getStats);
router.delete("/clear", cacheController.clearAll);
router.delete("/clear/:pattern", cacheController.clearByPattern);
router.get("/keys", cacheController.getKeys);
router.get("/:key", cacheController.getValue);
router.post("/:key", cacheController.setValue);
router.delete("/:key", cacheController.deleteKey);

module.exports = router;
