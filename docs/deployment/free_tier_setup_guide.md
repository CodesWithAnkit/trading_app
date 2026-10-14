# Zero Cost Deployment Guide

This guide walks through deploying your trading application on free tier infrastructure. Your web frontend runs on Vercel, your backend scanner runs on Render, and a free scheduled pinger keeps the backend awake during Indian stock market hours.

## Prerequisites

Have your accounts and credentials ready:

1. **GitHub repository**: Ensure your latest code is pushed to your GitHub repository.
2. **Supabase project**: Your existing Supabase database URL and service role key.
3. **Angel One SmartAPI**: Your API key, client code, password or PIN, and TOTP secret.
4. **Render account**: Free account at render.com.
5. **Vercel account**: Free account at vercel.com.
6. **Cron job account**: Free account at cron-job.org.

---

## Step 1: Deploy Backend to Render

### Option A: Using the Repository Blueprint (Recommended)

1. Log into your Render dashboard.
2. Click **New +** and select **Blueprint**.
3. Connect your GitHub repository.
4. Render detects the `render.yaml` file in the root directory.
5. Review the service definition named `trading-backend`.
6. Fill in the prompted secret environment variables:
   - `SUPABASE_URL`: Your Supabase project URL (example `https://xyz.supabase.co`)
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase server secret key
   - `ANGEL_ONE_API_KEY`: Your Angel One SmartAPI developer key
   - `ANGEL_ONE_CLIENT_ID`: Your Angel One client code
   - `ANGEL_ONE_PASSWORD`: Your Angel One password or trading PIN
   - `ANGEL_ONE_TOTP_SECRET`: Your Angel One base32 secret key for two factor authentication
   - `GEMINI_API_KEY`: Google Gemini API key (optional, for AI prediction insights)
7. Click **Apply**. Render builds the Docker container and deploys your service.

### Option B: Manual Web Service Setup

If you prefer setting it up without blueprints:

1. In Render, click **New +** and select **Web Service**.
2. Connect your GitHub repository.
3. Configure settings:
   - **Name**: `trading-backend`
   - **Region**: Singapore (lowest latency to Indian stock exchanges)
   - **Runtime**: `Docker`
   - **DockerfilePath**: `apps/backend/Dockerfile`
   - **Docker Context**: `.` (the repository root)
   - **Instance Type**: `Free`
   - **Health Check Path**: `/health`
4. Expand **Advanced** and set **Build Filter** paths:
   - `apps/backend/**`
   - `package.json`
   - `package-lock.json`
   - `.dockerignore`
5. Add the environment variables listed in Option A.
6. Click **Create Web Service**.

### Verify Backend Health

Once Render displays **Live**, visit your backend URL in a browser:
`https://<your-backend-name>.onrender.com/health`

You should receive a JSON response:
```json
{"status":"ok","timestamp":"2026-10-14T..."}
```

Copy your live backend URL for the next step.

---

## Step 2: Deploy Frontend to Vercel

1. Log into your Vercel dashboard.
2. Click **Add New...** and select **Project**.
3. Import your GitHub repository.
4. In the project configuration screen:
   - **Project Name**: `trading-web` (or your choice)
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Click Edit, select `apps/web`, and click Continue.
5. Expand the **Environment Variables** section and add:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your public Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your public Supabase anonymous key
   - `BACKEND_API_URL`: Your live Render backend URL from Step 1 (example `https://trading-backend.onrender.com`)
   - `NEXT_PUBLIC_SCANNER_STREAM_URL`: (Optional) Set to `https://trading-backend.onrender.com/api/v1/scanner/stream` if you want SSE streams to connect directly rather than through the proxy rewrite.
6. Click **Deploy**.
7. Once deployed, open your Vercel domain (example `https://trading-web.vercel.app`).

Verify that the dashboard loads, connects to Supabase, and displays market data.

---

## Step 3: Configure Market Hours Heartbeat on Cron-Job.org

Render free tier containers spin down after 15 minutes without incoming requests. Indian stock market trading hours are Monday through Friday from 09:15 to 15:30 IST.

To keep your scanner awake during trading hours while preserving your 750 free monthly hours:

1. Log into cron-job.org (free, no credit card required).
2. Go to **Cronjobs** and click **Create Cronjob**.
3. Enter the details:
   - **Title**: `Trading Backend Market Hours Wakeup`
   - **URL**: `https://<your-backend-name>.onrender.com/health`
   - **Execution schedule**: Select **User-defined** (cron expression)
   - **Cron Expression**: `*/10 3-10 * * 1-5`
   - *Explanation*:
     - In UTC time, 03:00 to 10:00 UTC corresponds to 08:30 to 15:30 IST.
     - `1-5` runs Monday through Friday.
     - `*/10` pings every 10 minutes.
   - **Request Method**: `GET`
   - **Request Timeout**: `30 seconds`
4. Under **Notifications**, enable alerts on failure so you receive an email if the service ever fails to respond.
5. Click **Create**.

### Monthly Usage Breakdown

- Market session duration: roughly 7 hours per trading day.
- Trading days per month: roughly 22 days.
- Total active hours per month: approximately 154 hours.
- Render free monthly limit: 750 hours.
- Remaining free margin: roughly 596 hours.

The container sleeps evenings, nights, and weekends, ensuring you never hit the monthly quota.

---

## Step 4: Maintenance and Operational Tips

### Cold Starts

When accessing the app outside market hours (such as late at night or on Sunday), Render will need about 50 seconds to boot the container from cold storage. The Next.js frontend will display loading states while the container wakes up.

### Daily Angel One Login

The backend automatically authenticates with Angel One on startup using your client code, password, and TOTP secret. When the heartbeat wakes up the container at 08:30 IST each morning, the backend establishes a fresh Angel One session ready for market open at 09:15 IST.
