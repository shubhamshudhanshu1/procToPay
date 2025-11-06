#!/bin/sh
set -e

echo "🔧 Running database migrations..."

# Run migrations (safe for production, skips if already applied)
npx prisma migrate deploy

echo "✅ Migrations complete"
echo "🚀 Starting application..."

# Execute the main command
exec "$@"

