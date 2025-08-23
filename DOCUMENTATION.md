# 📁 Sequential Jobs – Server Documentation

## 1. Overview

This is the backend service for the **Sequential Jobs** platform — a job marketplace that connects employers with job seekers. It handles:

- User authentication (including Google OAuth)
- Job posting and application logic
- Real-time messaging via Socket.IO
- File uploads
- Notifications
- Queue-based background jobs (via BullMQ)

---

## 2. Tech Stack

- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ORM)
- **Authentication**: Passport (Google OAuth 2.0), JWT
- **Queue System**: BullMQ with Redis (via ioredis)
- **File Uploads**: Multer + Cloudinary
- **Emailing**: Resend (with `@react-email/components`)
- **Security**: Helmet, CORS
- **Validation**: Zod
- **Deployment**: Node.js with `tsc` for building

---

## 3. Project Structure

src/
├── controllers/ # Route handlers (grouped by domain)
│ ├── admin/
│ ├── employer/
│ ├── seeker/
│ ├── auth.controller.ts
│ ├── emails_hook.controller.ts
│ ├── events.controller.ts
│ ├── landing.controller.ts
│ ├── livechat.controller.ts
│ ├── notification.controller.ts
│ └── ticket.controller.ts
│
├── helper/ # Utility/helper functions
├── middleware/ # Custom Express middlewares (auth, error, etc.)
├── models/ # Mongoose models
│ ├── assessment/
│ ├── interview/
│ ├── jobs/
│ ├── live-chat/
│ ├── medicals/
│ ├── documentation.model.ts
│ ├── notifications.model.ts
│ ├── ticket.model.ts
│ └── users.model.ts
│
├── routes/ # Express route definitions
├── utils/ # Utility constants, services (e.g., cloudinary, socket setup)
├── workers/ # Queue processors (BullMQ workers)
├── interface.ts # Global interfaces/types
└── server.ts # App entry point

---

## 4. Installation & Running Locally

### Prerequisites

- Node.js v18+
- MongoDB (local or Atlas)
- Redis (for BullMQ queues)

### Setup

```bash
git clone https://github.com/<your-org>/sequentialjobs-server.git
cd sequentialjobs-server
cp .env.example .env
npm install
npm run build
npm start
```

npm run dev

## 5. 🌐 Environment Variables (`.env`)

Below is a list of required environment variables. Use the provided `.env.example` file as a reference and replace with your actual values:

```env
PORT=8080

# Authentication Secrets
ACCESS_TOKEN_SECRET=
REFRESH_TOKEN_SECRET=
EMAIL_VERIFICATION_TOKEN=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_VERIFICATION_TOKEN=
GOOGLE_CALLBACK_URL=http://localhost:8080/api/auth/google/callback

# Database Credentials
DB_USER=
DB_PASS=
DB_NAME=

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Resend Email API
RESEND_API_KEY=
SENDER_EMAIL=
REPLYTO_EMAIL=

# Client Application URL
CLIENT_URL="http://localhost:3000"

# Node Environment
NODE_ENV=

# Stripe Payment Integration
STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Pricing Tiers (Freemium → Super Pro)
SEQUENTIAL_FREEMIUM=
SEQUENTIAL_STANDARD=
SEQUENTIAL_PRO=
SEQUENTIAL_SUPER_PRO=

# Redis (for BullMQ queues and Socket.IO adapter)
REDIS_HOST=
REDIS_PORT=
REDIS_USERNAME=
REDIS_PASS=

```

⚠️ Note: Do not commit your .env file to version control. Always use .env.example for shared configs and keep secrets secure.

## 6. 🔧 Key Modules

### 🧾 Authentication

- Uses **Passport** for Google OAuth 2.0
- Issues **JWT** tokens for authenticated API access
- Sessions supported via `express-session` (hybrid auth strategy)

### 📦 Job Queue

- **BullMQ** is used for background processing (e.g. email dispatch, PDF generation)
- Requires a Redis instance (`ioredis` is used)
- Queue workers are implemented in the `workers/` directory

### 📬 Email System

- Emails are sent using **Resend** and built with `@react-email/components`
- All email triggers and templates are managed in `emails_hook.controller.ts`

### 📤 File Uploads

- Media and resume uploads are handled via **Multer**
- Files are uploaded and stored in **Cloudinary**
- Upload logic and helpers are located in `utils/` or `helper/`

### 📡 Real-Time Communication

- **Socket.IO** enables live chat functionality between employers and seekers
- Socket server setup and Redis adapter config are defined in `server.ts`

---

## 7. 📚 API Structure

Each controller file manages a dedicated logical domain:

| Controller File              | Responsibility                           |
| ---------------------------- | ---------------------------------------- |
| `auth.controller.ts`         | Google login, JWT issuance, session auth |
| `emails_hook.controller.ts`  | Email triggers and templates             |
| `events.controller.ts`       | App/system event tracking                |
| `landing.controller.ts`      | Handles public/landing page content      |
| `livechat.controller.ts`     | Manages live chat messages               |
| `notification.controller.ts` | In-app notification logic                |
| `ticket.controller.ts`       | Support ticket system logic              |

---

## 8. 🛡️ Middleware

Located in the `middleware/` directory:

- **Authentication Middleware**: Validates JWT tokens and sessions
- **Error Middleware**: Centralized error handler with custom error classes
- **Rate Limiter**: Not yet implemented, but should be added for brute force protection

---

## 9. 🧩 Models

All models use **Mongoose** and are organized by feature/domain:

- `users.model.ts` — Manages user schema (freelancers and employers)
- `jobs/` — Job posting and management schemas
- `live-chat/` — Schema for real-time chat messages
- `notifications.model.ts` — Stores system and user-triggered notifications
- `ticket.model.ts` — Schema for support/help desk tickets

---

## 10. 📝 Notes for Developer Handoff

- Use **Zod** for validating request bodies in all new endpoints.
- For new socket event types, extend the Socket.IO logic in `server.ts` and ensure Redis pub/sub integration.
- To add new background jobs:
  1. Define a queue processor in the `workers/` directory
  2. Enqueue jobs from a controller using BullMQ
- Stick to the **domain-driven folder structure** — each feature should ideally include its controller, route, model, and any needed helpers.

---

## 11. ⚙️ Scripts

| Command         | Description                                     |
| --------------- | ----------------------------------------------- |
| `npm run dev`   | Transpile TypeScript in watch mode              |
| `npm run build` | Build the project using the TypeScript compiler |
| `npm start`     | Start the compiled server with nodemon          |
| `npm run email` | Placeholder script for local email testing      |

---

## 12. 🧪 Testing

> **Status**: Testing setup not yet implemented.

### Recommendation:

- Use **Jest** or **Vitest** for unit and integration tests
- Use `mongodb-memory-server` to mock MongoDB for isolated test environments
