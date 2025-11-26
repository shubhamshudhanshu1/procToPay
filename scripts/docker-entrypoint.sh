#!/bin/sh
set -e

# Make sure output is visible
exec 1>&2

echo "=========================================="
echo "DOCKER ENTRYPOINT STARTING"
echo "=========================================="
echo "🔧 Running database migrations..."

# Run migrations (safe for production, skips if already applied)
npx prisma migrate deploy || echo "⚠️  Migrations may have failed or already applied"

echo "✅ Migrations complete"

# Generate Prisma client (needed for seeding and app startup)
echo "🔨 Generating Prisma client..."
npx prisma generate

# Verify Prisma client was generated
if [ -d "node_modules/.pnpm/@prisma+client" ] || [ -d "node_modules/@prisma/client" ]; then
  echo "✅ Prisma client generated successfully"
else
  echo "⚠️  Warning: Prisma client directory not found in expected location"
  echo "   Listing Prisma-related directories:"
  find node_modules -name "*prisma*client*" -type d 2>/dev/null | head -5 || true
fi

# Seed database in development mode
if [ "$NODE_ENV" = "development" ]; then
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
fi

echo "🚀 Starting application..."

# Execute the main command
exec "$@"

