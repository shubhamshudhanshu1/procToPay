#!/bin/sh
set -e

echo "🔧 Running database migrations..."

# Run migrations (safe for production, skips if already applied)
npx prisma migrate deploy

echo "✅ Migrations complete"

# Generate Prisma client (needed for seeding)
echo "🔨 Generating Prisma client..."
npx prisma generate

echo "✅ Prisma client generated"

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

