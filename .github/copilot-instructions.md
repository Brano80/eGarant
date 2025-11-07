## eGarant — Copilot guidance (concise)

This file contains short, actionable information to help AI coding agents be productive in the eGarant monorepo.

1) Big picture
- Monorepo: backend + frontend + shared code. Backend lives in `server/` (Express + Drizzle). Frontend(s) live under `client/` and `apps/` (Vite + React). Shared types / schema live under `shared/` or `packages/`.
- The backend both serves APIs (MandateCheck prototype) and is the canonical server for the platform. Key entry: `server/index.ts` and `server/routes.ts`.

2) Quick dev & build commands (see `package.json`)
- Start backend in dev mode (ts-node-like runner): npm run dev  — this runs `tsx server/index.ts` with DATABASE_URL set to a local sqlite file.
- Build for production: npm run build  — runs `vite build` (frontend) and bundles `server/index.ts` via esbuild into `dist/`.
- Start built app: npm start  — runs `node dist/index.js`.
- DB migrations/push: npm run db:push  — uses `drizzle-kit push` (migrations are managed with Drizzle/Drizzle-kit).

3) Important config & conventions
- Vite config and frontend root: `vite.config.ts` sets root -> `client/`. The Vite config also defines import aliases:
  - `@` -> `client/src`
  - `@shared` -> `shared`
  - `@assets` -> `attached_assets`
  Use these aliases in frontend imports, e.g. `import X from '@/components/X'` or `import schema from '@shared/db/schema'`.
- TypeScript paths: `tsconfig.json` mirrors the same `@` and `@shared` mappings.
- API proxy for local frontend: `vite.config.ts` proxies `/api` and `/auth` to `http://localhost:3000` — backend default port.

4) Backend patterns to look for
- DB layer: `server/db.ts` and `server/migrate.ts` handle Drizzle setup and migrations. Search for `drizzle` imports.
- Routes & middleware: `server/routes.ts` and `server/middleware.ts` contain the API surface and auth helpers. When adding endpoints, register them here.
- Storage and uploads: `server/storage.ts` and multer types appear in deps — file-upload flow is implemented in middleware/storage.

5) Frontend and test apps
- Main SPA: `client/` (Vite + React). Test/prototype apps live in `apps/`, e.g. `apps/eudi-verifier-test/` is a lightweight test harness for the MandateCheck flow.

6) Useful examples and patterns (copyable)
- Start backend dev with local sqlite DB (already in package.json):
  - `npm run dev`
- Build production bundle (frontend + server):
  - `npm run build`  — output: `dist/` (server entry at `dist/index.js`).
- Push DB schema/migrations:
  - `npm run db:push`

7) Project-specific gotchas
- The repo bundles the server with esbuild in `npm run build` — server code is expected to be ESM (`type: "module"` in package.json).
- `vite.config.ts` sets `root` to `client/`. Running `vite` from project root without a script may work but be mindful of the `root` setting and proxy rules.
- There is no dedicated `dev` script that starts both Vite and the server; `npm run dev` starts only the server. For concurrent frontend HMR + backend, run the frontend dev server (`npx vite`) in a separate terminal.

8) Where to look first when editing features
- Add routes or change API behavior: `server/routes.ts`, `server/middleware.ts`, `server/index.ts`.
- Add DB changes: `shared/` or `server/db.ts` + update migrations and run `npm run db:push`.
- Frontend changes: `client/src/` or `apps/eudi-verifier-test/src/`. Use alias imports shown above.

9) TODOs & references
- Read `README.md` at repo root and `apps/eudi-verifier-test/README.md` for context about MandateCheck and the prototype flow.
- If you need to run browser-driven tests, see devDependency `playwright` (no test scripts declared by default).

If any section is unclear or you want more examples (e.g., typical request/response shapes or example DB schema), tell me which area to expand and I'll update this file.
