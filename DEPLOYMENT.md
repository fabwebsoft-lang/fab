# FabricCare - End-to-End Deployment Guide

FabricCare is a mobile-first laundry and dry-cleaning shop operations application built with React 19, TypeScript, Vite, Tailwind CSS v4, Express, tRPC v11, Drizzle ORM, Supabase PostgreSQL, and Google OAuth 2.0.

---

## ⚡ 1. Deploy on Vercel (Recommended)

1. Go to **[vercel.com/new](https://vercel.com/new)**.
2. Select and import your GitHub repository: **`fabwebsoft-lang/fab`**.
3. **Framework Preset**: Select **Vite** (or leave as Other; `vercel.json` is pre-configured).
4. **Environment Variables**: Add the following in your Vercel project settings:

| Variable | Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres` | Supabase Postgres URI (Transaction Pooler) |
| `SUPABASE_URL` | `https://[PROJECT-REF].supabase.co` | Supabase Project URL |
| `NODE_ENV` | `production` | Production environment |
| `JWT_SECRET` | *(Random 32+ character secret string)* | Session signing key |

5. Click **"Deploy"**. Vercel will build the frontend assets and automatically host the backend via Serverless Functions at `/api/*`.

---

## 🚀 2. Database Migrations (Supabase PostgreSQL)

Tables are managed via Drizzle ORM:
```bash
# Push schema changes to Supabase
pnpm drizzle-kit push
```

---

## 🔑 3. Google OAuth 2.0 (Optional)

1. Open [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth 2.0 Client ID** (Web application).
3. Add Authorized Redirect URIs:
   - Development: `http://localhost:3000/api/oauth/callback`
   - Production: `https://<your-vercel-domain>.vercel.app/api/oauth/callback`
4. Set in Vercel Environment Variables:
   ```env
   GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   ```

---

## 🛠️ 4. Local Development

```bash
# Install dependencies
pnpm install

# Run dev server
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000).
