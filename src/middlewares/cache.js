const redisService = require("../services/redis");

/**
 * Cache middleware for GET requests
 * @param {number} ttl - Time to live in seconds (default: 3600 = 1 hour)
 * @param {string} keyPrefix - Prefix for cache key (default: 'cache')
 */
const cache = (ttl = 3600, keyPrefix = "cache") => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return next();
    }

    try {
      // Create cache key from request
      const cacheKey = `${keyPrefix}:${req.originalUrl}:${JSON.stringify(
        req.query
      )}`;

      // Try to get from cache
      const cachedData = await redisService.getCache(cacheKey);

      if (cachedData) {
        console.log(`Cache hit for key: ${cacheKey}`);
        return res.json({
          ...cachedData,
          _cached: true,
          _cachedAt: new Date().toISOString(),
        });
      }

      // Store original res.json method
      const originalJson = res.json.bind(res);

      // Override res.json to cache the response
      res.json = async (data) => {
        try {
          // Cache the response
          await redisService.cache(cacheKey, data, ttl);
          console.log(`Cached response for key: ${cacheKey}`);
        } catch (error) {
          console.error("Failed to cache response:", error);
        }

        // Send the response
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error("Cache middleware error:", error);
      next();
    }
  };
};

/**
 * Clear cache by pattern
 * @param {string} pattern - Redis key pattern to clear
 */
const clearCache = async (pattern) => {
  try {
    const keys = await redisService.keys(pattern);
    if (keys.length > 0) {
      await Promise.all(keys.map((key) => redisService.del(key)));
      console.log(
        `Cleared ${keys.length} cache entries matching pattern: ${pattern}`
      );
    }
  } catch (error) {
    console.error("Failed to clear cache:", error);
  }
};

/**
 * Rate limiting middleware
 * @param {number} limit - Maximum requests per window
 * @param {number} window - Time window in seconds
 */
const rateLimit = (limit = 100, window = 60) => {
  return async (req, res, next) => {
    try {
      const clientId = req.ip || req.connection.remoteAddress;
      const key = `rate_limit:${clientId}`;

      const isLimited = await redisService.isRateLimited(key, limit, window);

      if (isLimited) {
        return res.status(429).json({
          error: "Too Many Requests",
          message: `Rate limit exceeded. Try again in ${window} seconds.`,
          retryAfter: window,
        });
      }

      next();
    } catch (error) {
      console.error("Rate limit middleware error:", error);
      next();
    }
  };
};

module.exports = {
  cache,
  clearCache,
  rateLimit,
};
