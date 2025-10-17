const { PrismaClient } = require("@prisma/client");
const redisService = require("../services/redis");

const prisma = new PrismaClient();

const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const cacheKey = `user:profile:${userId}`;

    // Try to get from cache first
    try {
      const cachedUser = await redisService.getCache(cacheKey);
      if (cachedUser) {
        console.log(`Cache hit for user profile: ${userId}`);
        return res.json({
          user: cachedUser,
          _cached: true,
        });
      }
    } catch (cacheError) {
      console.log("Cache miss or error, fetching from database");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Cache the user profile for 1 hour
    try {
      await redisService.cache(cacheKey, user, 3600);
      console.log(`Cached user profile: ${userId}`);
    } catch (cacheError) {
      console.error("Failed to cache user profile:", cacheError);
    }

    res.json({ user });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, email } = req.body;
    const cacheKey = `user:profile:${userId}`;

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: userId },
        },
      });

      if (existingUser) {
        return res.status(400).json({ error: "Email already in use" });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(email && { email }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Invalidate cache for this user
    try {
      await redisService.del(cacheKey);
      console.log(`Invalidated cache for user profile: ${userId}`);
    } catch (cacheError) {
      console.error("Failed to invalidate cache:", cacheError);
    }

    res.json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getProfile,
  updateProfile,
};
