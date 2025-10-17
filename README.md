# Proc to Pay - Full-Stack Application

A modern full-stack application with Node.js, Express, PostgreSQL, Prisma, React, and Redis caching.

## 🚀 Quick Start

```bash
# First time setup
npm run setup

# Daily development
npm run docker:dev

# Stop development
npm run docker:dev:down
```

## 🛠️ Tech Stack

**Backend:** Node.js, Express, PostgreSQL, Prisma, Redis, JWT  
**Frontend:** React, Vite, Tailwind CSS, Material UI, Zustand  
**DevOps:** Docker, Docker Compose, Nodemon (hot reload)

## 📁 Project Structure

```
proc-to-pay/
├── server.js                    # Express server
├── src/                         # Backend source
│   ├── routes/                  # API routes
│   ├── controllers/             # Route handlers
│   ├── middlewares/             # Express middlewares
│   ├── services/                # Business logic
│   └── utils/                   # Utilities
├── client/                      # React frontend
│   └── src/
│       ├── pages/               # React pages
│       ├── components/          # React components
│       ├── store/               # Zustand stores
│       └── services/            # API services
└── prisma/                      # Database schema
```

## 🚀 Available Commands

| Command                    | Purpose            |
| -------------------------- | ------------------ |
| `npm run setup`            | First-time setup   |
| `npm run docker:dev`       | Start development  |
| `npm run docker:dev:down`  | Stop development   |
| `npm run docker:dev:build` | Rebuild containers |
| `npm run reset`            | Clean everything   |

## 🌐 Access URLs

- **App:** http://localhost:5000
- **Health Check:** http://localhost:5000/api/health
- **Cache Stats:** http://localhost:5000/api/cache/stats

## 📚 API Endpoints

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Users (Protected)

- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

### Cache Management

- `GET /api/cache/stats` - Redis statistics
- `DELETE /api/cache/clear` - Clear all cache
- `GET /api/cache/keys` - List cache keys

## 🔧 Development Features

- **Hot Reload:** Code changes instantly reflected
- **Debugging:** VS Code debugging with Docker
- **Caching:** Redis integration for performance
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** JWT-based auth with protected routes

## 🚨 Troubleshooting

**"Module not found" after adding packages:**

```bash
npm run docker:dev:build
```

**"Port already in use":**

```bash
lsof -i :5000
```

**Everything broken:**

```bash
npm run reset
```

## 🔐 Environment Variables

All environment variables are automatically configured in Docker Compose files:

- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `JWT_SECRET` - JWT signing key
- `NODE_ENV` - Environment mode

## 🎯 Development Workflow

1. **Start development:** `npm run docker:dev`
2. **Make changes** - Hot reload automatically restarts
3. **Debug in VS Code** - Press F5 to attach debugger
4. **Test API** - Use Postman or curl
5. **Stop development:** `npm run docker:dev:down`

## 📝 License

MIT License
