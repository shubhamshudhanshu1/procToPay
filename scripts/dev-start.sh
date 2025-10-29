#!/bin/sh

# Development startup script
echo "🚀 Starting development server..."

# Install dependencies if node_modules doesn't exist or is empty
if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules)" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Push database schema
echo "🗄️ Setting up database..."
npx prisma db push

# Start development server
echo "🎯 Starting development server with live reload..."
npx ts-node-dev --inspect=0.0.0.0:9229 --respawn --transpile-only src/server.ts
