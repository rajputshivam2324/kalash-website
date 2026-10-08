# Kalash Code website

React + TypeScript + Vite marketing website with same-browser demo accounts. Everything lives in this directory. No database, Docker, backend configuration, or Vercel environment variables are required for the demo.

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

## Demo account storage

The website uses `src/demo-auth.ts` for signup, signin, session restoration, and logout. It does not request `/api/auth/*` or `/api/workspace`, so it works on a static Vercel deployment without the previously missing Express backend.

Accounts are saved in this browser's localStorage with a random 16-byte salt and a PBKDF2-SHA-256 password hash (600,000 iterations). Plaintext passwords are not stored or sent to a server. Sessions last 24 hours and survive refreshes and navigation. Signing out keeps the account available for another signin. Username matching is case-insensitive within the browser. Other tabs update after signin/signout.

These are **demo accounts**, not production authentication. Accounts work only in the same browser profile on the same website origin. Clearing site storage deletes them, and private-browsing storage may disappear when the browser closes. Browser storage is user-controlled: this mechanism does not protect private server data or reserve usernames globally. Use a demo password. The workspace only provides public product setup guides.

The existing `server/auth.ts` and `server/index.ts` file-backed server are retained for a future persistent backend, but the React demo no longer uses them. Switching to real accounts requires reconnecting that backend or adding shared persistent storage. No existing server account files are migrated into browser storage.

## Verification

```bash
npm run build
npm run test:auth
```

Fonts are served locally under `public/fonts` with their SIL Open Font License notices. No third-party font service is contacted at runtime.
