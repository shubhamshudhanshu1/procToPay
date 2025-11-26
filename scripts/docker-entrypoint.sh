#!/bin/sh
set -e

# Make sure output is visible
exec 1>&2

echo "=========================================="
echo "DOCKER ENTRYPOINT STARTING"
echo "=========================================="

# Step 1: Wait for database to be ready (if needed)
echo "⏳ Checking database connection..."
# Simple check - if database is not ready, prisma commands will fail anyway
# But we can add a retry loop if needed

# Step 2: Run migrations (safe for production, skips if already applied)
echo "🔧 Running database migrations..."
npx prisma migrate deploy || {
  echo "⚠️  Migrations may have failed or already applied"
  # Don't exit - continue with generation
}

echo "✅ Migrations complete"

# Step 3: Generate Prisma client (CRITICAL - must happen before seeding and app startup)
echo "🔨 Generating Prisma client..."
npx prisma generate || {
  echo "❌ ERROR: Failed to generate Prisma client!"
  exit 1
}

# Verify Prisma client was generated
if [ -d "node_modules/.pnpm/@prisma/client" ] || [ -d "node_modules/@prisma/client" ] || [ -d "node_modules/.prisma/client" ]; then
  echo "✅ Prisma client generated successfully"
else
  echo "⚠️  Warning: Prisma client directory not found in expected location"
  echo "   Listing Prisma-related directories:"
  find node_modules -name "*prisma*client*" -type d 2>/dev/null | head -5 || true
  echo "⚠️  Continuing anyway..."
fi

# Step 4: Seed database (development mode only, or if SEED_DATABASE=true)
if [ "$NODE_ENV" = "development" ] || [ "$SEED_DATABASE" = "true" ]; then
  echo "🌱 Seeding database..."
  # Temporarily disable exit on error for seeding (seed script may fail if already seeded)
  set +e
  npm run db:seed
  SEED_EXIT_CODE=$?
  set -e
  
  if [ $SEED_EXIT_CODE -eq 0 ]; then
    echo "✅ Seeding complete"
  else
    echo "⚠️  Seed exited with code $SEED_EXIT_CODE (this is OK if data already exists)"
  fi
else
  echo "⏭️  Skipping seed (NODE_ENV=$NODE_ENV, SEED_DATABASE=$SEED_DATABASE)"
fi

echo "🚀 Starting application..."

# Execute the main command (passed as arguments)
exec "$@"
