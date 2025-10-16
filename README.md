# Proc to Pay - Full-Stack JavaScript Application

A modern full-stack application built with Node.js, Express, PostgreSQL, Prisma, React, and Vite.

## 🚀 Tech Stack

### Backend

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **Prisma** - ORM
- **JWT** - Authentication
- **bcryptjs** - Password hashing

### Frontend

- **React** - UI library
- **Vite** - Build tool
- **React Router** - Routing
- **React Query** - Data fetching
- **Zustand** - State management
- **React Hook Form + Zod** - Form handling and validation
- **Axios** - HTTP client
- **Tailwind CSS** - Styling
- **Material UI** - Component library

## 📁 Project Structure

```
proc-to-pay/
├── package.json                 # Root package.json with scripts
├── server.js                    # Express server entry point
├── prisma/
│   └── schema.prisma            # Prisma schema
├── src/                         # Backend source code
│   ├── routes/                  # API routes
│   │   ├── index.js
│   │   ├── auth.js
│   │   └── users.js
│   ├── controllers/             # Route controllers
│   │   ├── authController.js
│   │   └── userController.js
│   ├── middlewares/             # Express middlewares
│   │   ├── auth.js
│   │   └── validation.js
│   ├── services/                # Business logic
│   │   └── index.js
│   └── utils/                   # Utility functions
│       └── index.js
└── client/                      # React frontend
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── pages/                # React pages
        │   ├── Login.jsx
        │   └── Dashboard.jsx
        ├── components/          # React components
        │   └── ProtectedRoute.jsx
        ├── store/               # Zustand stores
        │   └── authStore.js
        ├── services/            # API services
        │   ├── api.js
        │   └── authService.js
        └── schemas/             # Zod validation schemas
            └── authSchemas.js
```

## 🛠️ Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn

### 1. Clone and Install Dependencies

```bash
# Install root dependencies
npm install

# Install client dependencies
npm run install:all
```

### 2. Environment Setup

#### Automatic Setup (Recommended)

```bash
# For development
npm run setup

# For production
npm run setup:prod
```

This will automatically create `.env` files from templates.

#### Manual Setup

If you prefer manual setup, copy the appropriate template:

```bash
# For development
cp env.development.template .env

# For production
cp env.production.template .env
```

Then edit `.env` with your actual values:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/proc_to_pay"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

# Server
PORT=5000
NODE_ENV="development"
```

#### Client Environment

The setup script will also create `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

#### Environment Validation

The application includes automatic environment validation. All scripts will check your environment configuration before starting:

```bash
# Validate environment manually
npm run validate-env
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# (Optional) Seed the database
npx prisma db seed
```

### 4. Development

```bash
# Run both backend and frontend concurrently (with environment validation)
npm run dev

# Or run them separately:
npm run server    # Backend only (port 5000) - includes validation
npm run client   # Frontend only (port 5173)

# Production mode
npm run start:prod  # Sets up production environment and starts server
```

**Note**: All server scripts now include automatic environment validation to catch configuration issues early.

### 5. Production Build

```bash
# Build the frontend
npm run build

# Start the production server
npm start
```

## 📚 API Endpoints

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Users (Protected)

- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

### Health Check

- `GET /api/health` - Server health check

## 🔐 Authentication

The application uses JWT-based authentication:

1. **Registration/Login**: Users receive a JWT token
2. **Protected Routes**: Include `Authorization: Bearer <token>` header
3. **Token Storage**: Tokens are stored in Zustand store with persistence
4. **Auto-logout**: Invalid/expired tokens trigger automatic logout

## 🎨 Frontend Features

- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Material UI Components**: Professional UI components
- **Form Validation**: React Hook Form with Zod schemas
- **State Management**: Zustand for global state
- **Data Fetching**: React Query for server state
- **Protected Routes**: Authentication-based route protection
- **Auto-refresh**: Automatic token refresh and logout

## 🚀 Deployment

### Production Build

The application is configured to serve the React frontend from Express in production:

1. Build the frontend: `npm run build`
2. Start the server: `npm start`
3. Express serves static files from `client/dist`

### Environment Variables

Make sure to set the following environment variables in production:

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Strong secret key for JWT signing
- `NODE_ENV=production`

## 📝 Available Scripts

### Root Level

- `npm run dev` - Run both backend and frontend
- `npm run server` - Run backend only
- `npm run client` - Run frontend only
- `npm run build` - Build frontend for production
- `npm start` - Start production server
- `npm run install:all` - Install all dependencies

### Client Level

- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🔧 Development Notes

- **Hot Reload**: Both frontend and backend support hot reloading
- **API Proxy**: Vite proxies `/api` requests to `http://localhost:5000`
- **CORS**: Configured for development and production
- **Error Handling**: Comprehensive error handling on both ends
- **Validation**: Server-side and client-side validation
- **Security**: Helmet.js for security headers, bcrypt for password hashing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details
