# FabricCare - End-to-End Deployment Guide

FabricCare is a mobile-first laundry and dry-cleaning shop operations application built with React 19, TypeScript, Vite, Tailwind CSS v4, Express, tRPC v11, Drizzle ORM, MySQL/TiDB Serverless, Google OAuth 2.0, and Cloudflare R2 storage.

---

## 📋 Prerequisites

- **Node.js**: v20.x or higher
- **pnpm**: v9.x or higher
- **Database**: TiDB Serverless (Cloud) or local MySQL 8.0 instance
- **Storage**: Cloudflare R2 bucket (S3 compatible)
- **Authentication**: Google Cloud Console OAuth 2.0 Client Credentials

---

## 🚀 1. Database Provisioning (TiDB Serverless / MySQL)

1. Create a free database instance on [TiDB Cloud Serverless](https://tidbcloud.com/).
2. Copy the Connection String URL (MySQL protocol).
3. Set the `DATABASE_URL` variable in your `.env` file:
   ```env
   DATABASE_URL="mysql://<USER>:<PASSWORD>@<HOST>:4000/fabric_care?ssl={\"rejectUnauthorized\":true}"
   ```
4. Run Drizzle migrations to push table schemas (`users`, `shops`, `customers`, `orders`, `expenses`, `workers`, `devices`):
   ```bash
   pnpm drizzle-kit push
   ```

---

## 🔑 2. Google OAuth 2.0 Setup

1. Open [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth 2.0 Client ID** (Web application).
3. Add Authorized Redirect URIs:
   - Development: `http://localhost:5000/auth/google/callback`
   - Production: `https://your-production-app.onrender.com/auth/google/callback`
4. Copy `Client ID` and `Client Secret` into `.env`:
   ```env
   GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   ```

---

## 📦 3. Cloudflare R2 Storage Setup

1. Open [Cloudflare R2 Dashboard](https://dash.cloudflare.com/).
2. Create a new bucket named `fabric-care-storage`.
3. Create R2 API Tokens with **Object Read & Write** permissions.
4. Set the credentials in `.env`:
   ```env
   R2_ACCESS_KEY_ID="your-access-key-id"
   R2_SECRET_ACCESS_KEY="your-secret-access-key"
   R2_BUCKET_NAME="fabric-care-storage"
   R2_ENDPOINT="https://<YOUR_ACCOUNT_ID>.r2.cloudflarestorage.com"
   ```

---

## 🛠️ 4. Build & Verification

Before deploying, run full static analysis and unit tests:

```bash
# Typecheck
pnpm check

# Unit Tests
pnpm test

# Production Build
pnpm build
```

---

## 🌐 5. Production Deployment (Render / VPS)

### Option A: Render Web Service

1. Connect your repository to [Render.com](https://render.com).
2. Choose **Web Service**.
3. Set Environment Settings:
   - **Environment**: Node
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `pnpm start`
4. Add all environment variables from `.env.example` under **Environment Variables**.

### Option B: Docker / Node Server

```bash
export NODE_ENV=production
pnpm install --frozen-lockfile
pnpm build
node dist/index.js
```

---

## 🛡️ Multi-Shop Scoping & Security

- **Shop Isolation**: All queries enforce `WHERE shop_id = current_user.shop_id`.
- **Worker PIN Authentication**: Up to 5 counter devices supported per shop with bcrypt hashed PINs.
- **Session Tokens**: Signed JWT sessions stored securely in HttpOnly cookies.
