# Verify: Deploy Monorepo Web and Backend on Free Tier · spec 0016 · updated 2026-10-14
_Steps derived from spec 0016 deployment architecture. `/check verify` runs these; `/test` locks the durable ones._

## Deployment / manual
- [ ] Push repository commits to GitHub and verify Render blueprint recognizes `render.yaml`
- [ ] Check Render deployment logs and verify container builds and starts on port 10000
- [ ] Visit `https://<render-url>/health` and verify HTTP 200 response with `{"status":"ok", ...}`
- [ ] Connect `apps/web` to Vercel with `BACKEND_API_URL` set to the live Render URL
- [ ] Open the live Vercel web application and verify dashboard loads without browser CORS errors
- [ ] Set up user defined cron job on cron-job.org with schedule `*/10 3-10 * * 1-5` (UTC) and verify test ping succeeds

## Commands
- [ ] `npm run build -w apps/backend` → backend compiles cleanly with code 0
- [ ] `npm run test -w apps/backend -- src/app.controller.spec.ts` → health check unit tests pass
- [ ] `npm run build -w apps/web` → Next.js compiles with dynamic rewrites
