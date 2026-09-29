<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

- Design system: build all UI to `docs/STITCH_UI_IMPLEMENTATION_PLAN.md` (art direction and the maximalist product bar); token values live in CSS.

## Stack
- TypeScript; Next.js (web, `apps/web`) and NestJS (backend API plus scheduler, `apps/backend`); Supabase Postgres and Auth. Source: [0004 Proposed stack](docs/specs/0004-real-api-implementation/index.md).

## Agent skills
- [nestjs-best-practices](.agents/skills/nestjs-best-practices/): `kadajett/agent-nestjs-skills`, NestJS module, dependency injection, security, and performance conventions for `apps/backend`
- Declined: smartapi-javascript, technicalindicators, ws (no Agent Skill found)
- MCP servers: Angel One SmartAPI via `bhavesh0009/angel-one-mcp-server`, community built, can reach the live trading account (recommended)

## Context files
- [apps/web/lib/strategy/AGENTS.md](apps/web/lib/strategy/AGENTS.md): Strategy Engine Implementation pipeline and conventions
- [apps/backend/src/scanner/strategy/AGENTS.md](apps/backend/src/scanner/strategy/AGENTS.md): backend port of the strategy engine, including the live multi strategy engine
- [apps/backend/src/scanner/market-data/AGENTS.md](apps/backend/src/scanner/market-data/AGENTS.md): Angel One feed provider, tick normalization, and 1m/5m candle aggregation
