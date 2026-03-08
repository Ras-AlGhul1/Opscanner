# 🎯 OpportunityScanner — Full Deployment Guide

A real-time AI-powered opportunity scanner that discovers profitable arbitrage, betting, and reselling opportunities. Built with Next.js, Node.js/Express, and Supabase.

---

## 📁 Project Structure

```
opportunityscanner/
├── frontend/                    # Next.js app → deployed to Vercel
│   ├── app/
│   │   ├── layout.tsx           # Root layout + fonts
│   │   ├── globals.css          # Global styles
│   │   ├── page.tsx             # Landing page
│   │   ├── auth/
│   │   │   ├── layout.tsx       # Auth page wrapper
│   │   │   ├── login/page.tsx   # Login form
│   │   │   └── signup/page.tsx  # Signup form
│   │   └── dashboard/
│   │       ├── layout.tsx       # Sidebar + nav layout
│   │       ├── page.tsx         # Live feed dashboard
│   │       └── saved/page.tsx   # Saved opportunities
│   ├── components/
│   │   └── OpportunityCard.tsx  # Opportunity card UI
│   ├── lib/
│   │   ├── supabase.ts          # Browser Supabase client
│   │   └── supabase-server.ts   # Server Supabase client
│   ├── types/index.ts           # TypeScript types
│   └── .env.example             # Required env vars
│
├── backend/                     # Express API → deployed to Railway/Render
│   ├── src/
│   │   ├── index.js             # Express server entry point
│   │   ├── supabase.js          # Supabase service client
│   │   ├── routes/
│   │   │   └── opportunities.js # REST API routes
│   │   └── services/
│   │       ├── scanner.js       # AI scanner engine
│   │       └── seed.js          # Database seeder
│   └── .env.example             # Required env vars
│
└── database/
    └── schema.sql               # Complete DB schema + seed data
```

---

## 🚀 STEP 1: Supabase Setup

### 1.1 Create Project
1. Go to [https://supabase.com](https://supabase.com) → **New Project**
2. Name it `opportunityscanner`
3. Set a strong database password (save it!)
4. Choose a region close to your users
5. Wait ~2 minutes for provisioning

### 1.2 Run Database Schema
1. In Supabase dashboard → **SQL Editor** → **New Query**
2. Paste the entire contents of `database/schema.sql`
3. Click **Run** (green button)
4. You should see: `Setup complete! | 30 opportunities_seeded`

### 1.3 Enable Authentication
1. Go to **Authentication** → **Providers**
2. Ensure **Email** is enabled (it is by default)
3. Under **Email** settings:
   - Set "Confirm email" to **OFF** for MVP (easier testing)
   - Or leave ON and configure SMTP for production emails
4. Go to **Authentication** → **URL Configuration**:
   - Set **Site URL** to your Vercel URL (e.g., `https://your-app.vercel.app`)
   - Add `http://localhost:3000` to **Redirect URLs** for local dev

### 1.4 Get API Keys
1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (backend only — keep secret!)

---

## 🌐 STEP 2: Deploy Frontend to Vercel

### 2.1 Push to GitHub
```bash
# From the project root
git init
git add .
git commit -m "Initial OpportunityScanner commit"
gh repo create opportunityscanner --public --source=. --push
# Or push to an existing repo
```

### 2.2 Connect to Vercel
1. Go to [https://vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repository
3. **IMPORTANT**: Set **Root Directory** to `frontend`
4. Framework: **Next.js** (auto-detected)

### 2.3 Add Environment Variables in Vercel
Under **Environment Variables**, add:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` (anon key) |
| `NEXT_PUBLIC_API_URL` | Your backend URL (or leave empty to use Supabase direct) |

### 2.4 Deploy
Click **Deploy**. Vercel will build and deploy automatically.
Your app will be live at `https://your-project.vercel.app`

### 2.5 Update Supabase Redirect URLs
After getting your Vercel URL:
1. Supabase → **Authentication** → **URL Configuration**
2. Add `https://your-project.vercel.app` to **Redirect URLs**

---

## ⚙️ STEP 3: Deploy Backend to Railway (Recommended)

The backend runs the AI scanner that generates new opportunities automatically.

### Option A: Railway (Recommended — easiest)

1. Go to [https://railway.app](https://railway.app) → **New Project**
2. **Deploy from GitHub repo** → select your repo
3. Set **Root Directory** to `backend`
4. Railway auto-detects Node.js

**Add Environment Variables** in Railway:

| Key | Value |
|-----|-------|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` (service role key) |
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app,http://localhost:3000` |
| `PORT` | `3001` |

5. Railway will deploy and give you a URL like `https://backend.up.railway.app`
6. Copy this URL → add to Vercel as `NEXT_PUBLIC_API_URL`

### Option B: Render

1. Go to [https://render.com](https://render.com) → **New Web Service**
2. Connect GitHub repo, set root to `backend`
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Add same environment variables as above
6. Deploy → get URL → set as `NEXT_PUBLIC_API_URL` in Vercel

### Option C: Run Locally (Development)
```bash
cd backend
cp .env.example .env
# Fill in your .env with Supabase keys
npm install
npm run dev
# Scanner starts automatically, generates opportunities every 2 min
```

> **Note**: Without the backend, the frontend falls back to direct Supabase queries.
> The live feed still works — it just won't auto-generate new opportunities.
> You can seed manually: `cd backend && npm run seed`

---

## 🧪 STEP 4: Testing the App

### 4.1 Test User Auth
1. Go to your Vercel URL
2. Click **Get Access** → **Create Account**
3. Fill in email, username, password
4. Should redirect to `/dashboard` automatically
5. Check Supabase **Authentication** → **Users** — your user should appear

### 4.2 Test Opportunity Feed
1. Dashboard should show 30 seed opportunities immediately
2. Cards should display: title, profit, confidence bar, category, source, time
3. Auto-refreshes every 30 seconds (watch for new cards)
4. Test filters: click category buttons (Sports Betting, Crypto, etc.)
5. Test sort: change dropdown to "Highest Profit"

### 4.3 Test Save/Bookmark
1. Click the bookmark icon on any opportunity card
2. Icon turns yellow = saved
3. Navigate to **Saved** in sidebar
4. Saved opportunity should appear
5. Click bookmark again = removes from saved

### 4.4 Test Scanner (Backend)
If backend is deployed:
1. Check backend health: `https://your-backend.railway.app/health`
2. Should return: `{"status":"ok","timestamp":"...","uptime":...}`
3. Wait 2 minutes → new opportunities appear in feed automatically
4. Check API directly: `https://your-backend.railway.app/api/opportunities`

### 4.5 Manual Seed (if needed)
```bash
cd backend
node src/services/seed.js
# Generates 30 new opportunities
```

---

## 🔧 Local Development

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local
# Add your Supabase keys to .env.local
npm run dev
# Opens at http://localhost:3000
```

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Add your Supabase service role key
npm run dev
# API at http://localhost:3001
# Scanner starts generating opportunities immediately
```

---

## 🌍 Environment Variables Summary

### Frontend (.env.local / Vercel)
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_API_URL=https://your-backend.railway.app  # optional
```

### Backend (.env / Railway)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:3000
PORT=3001
```

---

## 🛡️ Security Notes

- **Never expose** `SUPABASE_SERVICE_ROLE_KEY` in frontend code
- Row Level Security (RLS) is enabled on all tables
- Users can only access/modify their own data
- Rate limiting is enabled on backend API (100 req/min)
- CORS is restricted to your allowed origins

---

## 📊 Database Tables

| Table | Purpose |
|-------|---------|
| `user_profiles` | User email, username |
| `opportunities` | All scanned opportunities |
| `saved_opportunities` | User bookmarks (join table) |

---

## 🔄 How the Scanner Works

1. Backend starts → generates 15 initial opportunities
2. Every 2 minutes → generates 2–6 new opportunities across all 5 categories
3. Every 30 minutes → cleans opportunities beyond the 500-item limit
4. Frontend polls for new data every 30 seconds
5. New items appear at top of feed with "NEW" badge for 8 seconds

---

## 🚨 Troubleshooting

**"No Opportunities Found" on dashboard**
→ Run the seed script: `cd backend && npm run seed`
→ Or check the scanner is running (backend health endpoint)

**Auth redirect loop**
→ Check Supabase URL Configuration has your app URL in Redirect URLs

**CORS errors**
→ Add your Vercel URL to `ALLOWED_ORIGINS` in backend env

**Supabase RLS blocking inserts**
→ Backend must use `SUPABASE_SERVICE_ROLE_KEY`, not the anon key

**Vercel build fails**
→ Ensure Root Directory is set to `frontend` in Vercel project settings

---

## 🗺️ Next Steps / Roadmap

- [ ] Real data sources (odds APIs, crypto WebSockets, retail scrapers)
- [ ] Push notifications (Web Push API)
- [ ] Email alerts for high-confidence opportunities
- [ ] User preference filters (min profit, categories)
- [ ] Opportunity history and tracking
- [ ] Profit calculator with stake sizing
- [ ] Premium subscription with Stripe
- [ ] Mobile app (React Native)
