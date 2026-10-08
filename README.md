# Kalash Code website

React + TypeScript + Vite marketing website with a small Express authentication server. Everything lives in this directory. No database or Docker is required.

## Run locally

Requires Node.js 22.12+ (or 20.19+).

```bash
npm install
npm run dev
```

Open **http://127.0.0.1:5173**. The API runs on port 3001 and Vite proxies `/api` to it.

## Production build

```bash
npm run build
npm start
```

Open **http://127.0.0.1:3001**. Express serves the compiled website and the API from the same origin.

## Pages

- `/`: product story, illustrative terminal walkthrough, features, interfaces, runtime architecture, company, and FAQ.
- `/docs`: developer guide with copyable, source-verified setup commands.
- `/signup` and `/signin`: username/password authentication.
- `/workspace`: authenticated account and local-runtime setup guidance.

The walkthrough uses illustrative examples and does not call a model provider. The website does not launch the Kalash coding agent; that runtime runs in the developer's own environment.

## Vercel frontend deployment

Deploy this directory as a **Vite** project, with build command `npm run build` and output directory `dist`. `vercel.json` rewrites `/docs`, `/signin`, `/signup`, and `/workspace` to the React entry point. These routes then work when opened directly, refreshed, or reached through navigation. Trailing slashes are normalized. Static assets and `/api` paths are not rewritten to HTML.

After adding or changing `vercel.json`, deploy a new version; a previously built deployment does not pick up local changes. This applies to `kalashcode.shivamio.in` as well as Vercel preview domains.

**Authentication hosting:** a Vite-only deployment does not run `server/index.ts`. The file-backed account server needs a persistent, single-process Node host. A Vercel serverless function's filesystem and in-memory sessions are not durable/shared account storage, so moving the existing server into a function is not a reliable fix. To keep the no-database setup, host the Express server on a persistent Node host and proxy `/api/:path*` to that host before the page rewrites. Set `APP_ORIGIN=https://kalashcode.shivamio.in` and `COOKIE_SECURE=true` on that backend. Until a backend is connected, sign-in forms report that the account service is unavailable.

## Account storage

Accounts are persisted in `.data/accounts.json` with per-account random salts and Node scrypt password hashes. There are no plaintext passwords. The `.data` directory is ignored by Git. Writes are serialized and committed with an atomic rename. This file store is designed for one server process.

Sessions use random server-managed tokens in HttpOnly, SameSite=Strict cookies and expire after 24 hours. Sessions are held in memory, so restarting the server signs users out while retaining accounts. Authentication endpoints validate inputs, enforce permitted origins, and limit attempts. Password reset and email verification are not included.

### Environment settings

Optional `.env` files are not automatically loaded. Export environment variables in your shell before starting:

- `PORT`: server port, default `3001`.
- `APP_ORIGIN`: comma-separated allowed browser origins for write requests. Defaults to localhost and 127.0.0.1 on ports 5173 and 3001. Set this to your exact public HTTPS origin when hosting.
- `COOKIE_SECURE=true`: use HTTPS-only cookies when hosting with TLS.
- `ACCOUNT_FILE`: absolute path to account storage, default `.data/accounts.json`.

The server binds to `127.0.0.1`. Use a reverse proxy for public hosting. Keep the account file outside publicly served directories and retain a writable persistent directory. No hosting configuration or container files are included.

## Verification

```bash
npm run build
npm run test:auth
```

Fonts are served locally under `public/fonts` with their SIL Open Font License notices. No third-party font service is contacted at runtime.
