# 0016 Rationale · Deploy Monorepo Web and Backend on Free Tier Infrastructure

## Context

Your application consists of two distinct components with different operational characteristics. The web frontend is a Next.js application that renders user interfaces and consumes backend APIs. The backend is a NestJS application that integrates with Angel One SmartAPI over WebSocket, normalizes ticks, aggregates candles, runs quantitative trading strategies, and pushes live updates through Server Sent Events. Persistence and authentication reside in Supabase.

Traditional serverless hosting cannot support this backend. The Angel One connection requires a persistent WebSocket connection that stays open during trading hours (09:15 to 15:30 IST). Serverless functions terminate after brief execution windows, which drops the socket connection and destroys in memory tick buffers.

Free cloud container platforms typically enforce idle sleep timeouts. For example, Render free web services spin down after 15 minutes without incoming HTTP traffic. The challenge is to maintain continuous backend execution throughout market hours without paying for dedicated cloud compute or exceeding free monthly usage allowances (such as Render's 750 free instance hours per month).

## Options considered

### Option 1: Vercel for Frontend plus Render for Backend with Market Hours Heartbeat

Deploy the Next.js web application to Vercel on the Hobby tier. Deploy the NestJS backend to a Render free web service using a multi stage Dockerfile. Use an external scheduled pinger (such as cron job org) to send HTTP requests to the backend health endpoint every 10 minutes from 09:00 to 15:35 IST, Monday through Friday. Proxy web requests to the backend using Next.js rewrites to eliminate browser cross origin issues.

**Pros**:
- Completely free without credit card billing traps
- Render supports persistent WebSockets and Server Sent Events without early termination
- Scheduled pinging preserves monthly free hours by letting the service sleep evenings and weekends
- Vercel offers best in class performance and edge routing for Next.js

**Cons**:
- First request of the morning or after hours experiences a cold start delay of around 50 seconds
- Requires configuring an external free cron pinger schedule

### Option 2: Oracle Cloud Infrastructure Always Free Compute Virtual Machine

Deploy both web and backend on an Oracle Cloud Infrastructure Always Free ARM compute instance (providing up to 4 virtual CPU cores and 24 gigabytes of memory) using Docker Compose.

**Pros**:
- Full virtual machine control with zero idle sleep and continuous uptime
- Generous memory and processor limits

**Cons**:
- High operational overhead requiring Linux server hardening, firewall setup, and manual security patch updates
- New account registrations frequently face capacity limits or verification hurdles in popular regions

### Option 3: Local Server or Mini PC with Cloudflare Tunnel

Run the backend on a dedicated local machine or mini PC connected through Cloudflare Tunnel to expose secure public endpoints.

**Pros**:
- Hardware is completely under your control with zero cloud hosting cost
- Keeps Angel One credentials and session tokens on your local machine

**Cons**:
- Depends entirely on home power and internet connection stability
- Downtime if the host machine goes to sleep or loses local network connectivity

### Option 4: Full Serverless Architecture on Edge Platforms

Decompose the backend into edge functions and database webhooks.

**Pros**:
- Scales automatically to zero with instant startup

**Cons**:
- Incompatible with persistent Angel One WebSocket connections and in memory candle aggregators
- Would require complete architectural rewrite of the market data scanner engine

## Rationale

Render free web services support long running container processes, persistent outbound WebSockets, and inbound Server Sent Events without connection dropping. This directly satisfies the Angel One market data streaming requirement.

Indian trading sessions run from 09:15 to 15:30 IST, roughly 6.25 hours per day across approximately 22 trading days per month. Keeping the container active from 09:00 to 15:35 IST consumes roughly 145 instance hours per month. This uses less than 20 percent of Render's 750 free monthly hours, leaving ample headroom while completely avoiding idle spin down during trading hours.

Deploying the frontend to Vercel provides seamless Next.js build optimization, global edge distribution, and zero maintenance overhead. Using Next.js rewrites in `next.config.ts` allows the browser to send all API and stream requests to `/api/*` on the web domain. Vercel forwards those requests to Render on the server side, which avoids browser cross origin resource sharing (CORS) complications and keeps cookies and headers unified.
