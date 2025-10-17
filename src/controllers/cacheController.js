const redisService = require("../services/redis");
const { clearCache } = require("../middlewares/cache");

/**
 * Cache management controller
 */
class CacheController {
  /**
   * Get cache statistics
   */
  async getStats(req, res) {
    try {
      const info = await redisService.client.info();
      const memory = await redisService.client.info("memory");
      const stats = await redisService.client.info("stats");

      res.json({
        status: "success",
        data: {
          info: info,
          memory: memory,
          stats: stats,
          connected: redisService.isConnected,
        },
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Failed to get cache statistics",
        error: error.message,
      });
    }
  }

  /**
   * Clear all cache
   */
  async clearAll(req, res) {
    try {
      await redisService.flushAll();
      res.json({
        status: "success",
        message: "All cache cleared successfully",
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Failed to clear cache",
        error: error.message,
      });
    }
  }

  /**
   * Clear cache by pattern
   */
  async clearByPattern(req, res) {
    try {
      const { pattern } = req.params;
      await clearCache(pattern);

      res.json({
        status: "success",
        message: `Cache cleared for pattern: ${pattern}`,
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Failed to clear cache by pattern",
        error: error.message,
      });
    }
  }

  /**
   * Get cache keys by pattern
   */
  async getKeys(req, res) {
    try {
      const { pattern = "*" } = req.query;
      const keys = await redisService.keys(pattern);

      res.json({
        status: "success",
        data: {
          keys: keys,
          count: keys.length,
          pattern: pattern,
        },
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Failed to get cache keys",
        error: error.message,
      });
    }
  }

  /**
   * Get cache value by key
   */
  async getValue(req, res) {
    try {
      const { key } = req.params;
      const value = await redisService.get(key);

      res.json({
        status: "success",
        data: {
          key: key,
          value: value,
          exists: value !== null,
        },
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Failed to get cache value",
        error: error.message,
      });
    }
  }

  /**
   * Set cache value
   */
  async setValue(req, res) {
    try {
      const { key } = req.params;
      const { value, ttl } = req.body;

      if (ttl) {
        await redisService.set(key, value, ttl);
      } else {
        await redisService.set(key, value);
      }

      res.json({
        status: "success",
        message: "Cache value set successfully",
        data: {
          key: key,
          ttl: ttl || "no expiration",
        },
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Failed to set cache value",
        error: error.message,
      });
    }
  }

  /**
   * Delete cache key
   */
  async deleteKey(req, res) {
    try {
      const { key } = req.params;
      const result = await redisService.del(key);

      res.json({
        status: "success",
        message: result ? "Key deleted successfully" : "Key not found",
        data: {
          key: key,
          deleted: result > 0,
        },
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Failed to delete cache key",
        error: error.message,
      });
    }
  }
}

module.exports = new CacheController();
