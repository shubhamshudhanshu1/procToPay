#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

console.log("🚀 Setting up Proc to Pay...\n");

// Create .env file if it doesn't exist
const envPath = path.join(__dirname, ".env");
if (!fs.existsSync(envPath)) {
  // Determine which template to use based on environment
  const env = process.env.NODE_ENV || "development";
  const templateFile =
    env === "production"
      ? "env.production.template"
      : "env.development.template";
  const templatePath = path.join(__dirname, templateFile);

  if (fs.existsSync(templatePath)) {
    fs.copyFileSync(templatePath, envPath);
    console.log(`✅ Created .env file from ${templateFile}`);
  } else {
    // Fallback to env.example if templates don't exist
    const examplePath = path.join(__dirname, "env.example");
    if (fs.existsSync(examplePath)) {
      fs.copyFileSync(examplePath, envPath);
      console.log("✅ Created .env file from env.example");
    } else {
      console.error("❌ No environment template found!");
      process.exit(1);
    }
  }

  console.log("⚠️  Please edit .env with your actual values");
} else {
  console.log("✅ .env file already exists");
}

// Create client .env file if it doesn't exist
const clientEnvPath = path.join(__dirname, "client", ".env");
if (!fs.existsSync(clientEnvPath)) {
  const clientEnvContent = `VITE_API_URL=http://localhost:5000/api`;
  fs.writeFileSync(clientEnvPath, clientEnvContent);
  console.log("✅ Created client/.env file");
} else {
  console.log("✅ client/.env file already exists");
}

console.log("\n📋 Next steps:");
console.log(
  "1. Update the DATABASE_URL in .env with your PostgreSQL credentials"
);
console.log("2. Change the JWT_SECRET to a secure random string");
console.log("3. Run: npm run install:all");
console.log("4. Run: npx prisma generate");
console.log("5. Run: npx prisma db push");
console.log("6. Run: npm run dev");
console.log("\n🎉 Setup complete!");
