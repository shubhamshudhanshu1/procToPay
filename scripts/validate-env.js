#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

console.log("🔍 Validating environment configuration...\n");

// Check if .env file exists
const envPath = path.join(__dirname, "..", ".env");
if (!fs.existsSync(envPath)) {
  console.error("❌ .env file not found!");
  console.log("💡 Run: npm run setup");
  process.exit(1);
}

// Load environment variables
require("dotenv").config({ path: envPath });

// Required environment variables
const requiredVars = {
  DATABASE_URL: "Database connection string",
  JWT_SECRET: "JWT secret key for token signing",
  PORT: "Server port number",
  NODE_ENV: "Environment mode (development/production)",
};

// Check for missing variables
const missing = [];
const warnings = [];

for (const [key, description] of Object.entries(requiredVars)) {
  if (!process.env[key]) {
    missing.push({ key, description });
  } else if (key === "JWT_SECRET" && process.env[key].includes("change-this")) {
    warnings.push({ key, description, message: "Using default/example value" });
  }
}

// Report results
if (missing.length > 0) {
  console.error("❌ Missing required environment variables:");
  missing.forEach(({ key, description }) => {
    console.error(`   - ${key}: ${description}`);
  });
  console.log("\n💡 Please update your .env file with the missing variables.");
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn("⚠️  Environment warnings:");
  warnings.forEach(({ key, description, message }) => {
    console.warn(`   - ${key}: ${message}`);
  });
  console.log("\n💡 Consider updating these values for security.");
}

console.log("✅ Environment configuration is valid!");

// Additional checks
if (process.env.NODE_ENV === "production") {
  console.log("🏭 Running in production mode");

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn(
      "⚠️  JWT_SECRET should be at least 32 characters for production"
    );
  }
} else {
  console.log("🔧 Running in development mode");
}
