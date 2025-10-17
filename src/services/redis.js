const { createClient } = require("redis");

class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

      this.client = createClient({
        url: redisUrl,
        retry_strategy: (options) => {
          if (options.error && options.error.code === "ECONNREFUSED") {
            console.error("Redis connection refused");
            return new Error("Redis connection refused");
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            console.error("Redis retry time exhausted");
            return new Error("Retry time exhausted");
          }
          if (options.attempt > 10) {
            console.error("Redis max retry attempts reached");
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        },
      });

      this.client.on("error", (err) => {
        console.error("Redis Client Error:", err);
        this.isConnected = false;
      });

      this.client.on("connect", () => {
        console.log("Redis Client Connected");
        this.isConnected = true;
      });

      this.client.on("ready", () => {
        console.log("Redis Client Ready");
        this.isConnected = true;
      });

      this.client.on("end", () => {
        console.log("Redis Client Disconnected");
        this.isConnected = false;
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      console.error("Failed to connect to Redis:", error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  async get(key) {
    if (!this.isConnected) {
      throw new Error("Redis client not connected");
    }
    return await this.client.get(key);
  }

  async set(key, value, expireInSeconds = null) {
    if (!this.isConnected) {
      throw new Error("Redis client not connected");
    }

    if (expireInSeconds) {
      return await this.client.setEx(key, expireInSeconds, value);
    }
    return await this.client.set(key, value);
  }

  async del(key) {
    if (!this.isConnected) {
      throw new Error("Redis client not connected");
    }
    return await this.client.del(key);
  }

  async exists(key) {
    if (!this.isConnected) {
      throw new Error("Redis client not connected");
    }
    return await this.client.exists(key);
  }

  async expire(key, seconds) {
    if (!this.isConnected) {
      throw new Error("Redis client not connected");
    }
    return await this.client.expire(key, seconds);
  }

  async keys(pattern) {
    if (!this.isConnected) {
      throw new Error("Redis client not connected");
    }
    return await this.client.keys(pattern);
  }

  async flushAll() {
    if (!this.isConnected) {
      throw new Error("Redis client not connected");
    }
    return await this.client.flushAll();
  }

  // Cache helper methods
  async cache(key, data, ttl = 3600) {
    const value = JSON.stringify(data);
    return await this.set(key, value, ttl);
  }

  async getCache(key) {
    const value = await this.get(key);
    return value ? JSON.parse(value) : null;
  }

  // Session management
  async setSession(sessionId, sessionData, ttl = 86400) {
    // 24 hours default
    const key = `session:${sessionId}`;
    return await this.cache(key, sessionData, ttl);
  }

  async getSession(sessionId) {
    const key = `session:${sessionId}`;
    return await this.getCache(key);
  }

  async deleteSession(sessionId) {
    const key = `session:${sessionId}`;
    return await this.del(key);
  }

  // Rate limiting
  async incrementCounter(key, ttl = 60) {
    const current = await this.get(key);
    const count = current ? parseInt(current) + 1 : 1;
    await this.set(key, count.toString(), ttl);
    return count;
  }

  async isRateLimited(key, limit, ttl = 60) {
    const count = await this.incrementCounter(key, ttl);
    return count > limit;
  }
}

// Create singleton instance
const redisService = new RedisService();

module.exports = redisService;
