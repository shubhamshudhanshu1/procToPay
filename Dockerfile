# Simple production Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install OpenSSL and other dependencies for Prisma
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies (including dev dependencies for build)
RUN npm ci
RUN cd client && npm ci

# Copy source code
COPY . .

# Build React app first (doesn't need Prisma)
RUN cd client && npm run build

# Generate Prisma client at runtime (will be done when container starts)
# This avoids the SSL certificate issue during build

# Expose port
EXPOSE 5000

# Start application with Prisma generation and SSL workaround
CMD ["sh", "-c", "NODE_TLS_REJECT_UNAUTHORIZED=0 npx prisma generate && npm start"]
