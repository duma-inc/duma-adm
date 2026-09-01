# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Overview

Duma Admin (`duma-adm`) is the administrative control panel for the Duma ecosystem. It is a Next.js 14 (App Router) app using Chakra UI for components, Tailwind CSS for layout utilities, and NextAuth + Keycloak for authentication. It is a thin frontend over a separate backend API (the "duma" backend); this repo contains no database — all data is fetched from the backend. UI text and code comments are in Portuguese (pt-BR).

## Commands

```bash
npm run dev      # dev server (next dev), default port 3000
npm run build    # production build
npm run start    # serve the production build (PORT defaults to 3002 in Docker)
npm run lint     # next lint (eslint)
```

There is no test suite configured.

`next.config.mjs` sets `typescript.ignoreBuildErrors` and `eslint.ignoreDuringBuilds` to `true`, so `npm run build` does **not** catch type or lint errors. Run `npx tsc --noEmit` and `npm run lint` explicitly to validate changes.

## Environment

Copy `.env.local` and fill in:
- `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET`, `KEYCLOAK_ISSUER` — server-side auth
- `NEXT_PUBLIC_KEYCLOAK_ISSUER`, `NEXT_PUBLIC_KEYCLOAK_CLIENT_ID` — client-exposed auth values
- `NEXT_PUBLIC_API_URL` — backend base URL used by the browser (axios) and as SSR fallback
- `API_INTERNAL_URL` — backend URL used only by server-side `fetchBackendJson` to bypass nginx (which would strip the `/api/` prefix); falls back to `NEXT_PUBLIC_API_URL` then `localhost:8080`
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET`

## Architecture

### Two distinct backend-call paths

There are **two separate HTTP clients**, and choosing the right one matters:

1. **Client-side: axios via [src/lib/api.ts](src/lib/api.ts)** — used by all service modules in [src/services/](src/services/). The access token is *not* read from the session per-request. Instead, `ApiAuthBridge` in [src/app/providers.tsx](src/app/providers.tsx) watches the NextAuth session and calls `setApiAccessToken()` / `clearApiAccessToken()` to push the token into a module-level variable, which a request interceptor attaches as `Authorization: Bearer`. This means service calls only work from `'use client'` components rendered under `Providers`.

2. **Server-side: `fetchBackendJson` in [src/lib/server-api.ts](src/lib/server-api.ts)** — used by Server Components (e.g. [src/app/page.tsx](src/app/page.tsx)). The access token is obtained explicitly via `getServerSession(authOptions)` and passed in. Supports `revalidateSeconds` for Next.js cache. Throws `BackendRequestError` on non-2xx.

### Services layer

Every backend resource has a service module in [src/services/](src/services/) (e.g. `exerciseService`, `studentService`). Each exports its TypeScript domain types alongside a service object with CRUD methods (`getAll`, `getById`, `create`, `update`, `delete`, sometimes `createBatch`). Domain types live in the service file, not in `src/types/` (`src/types/` only holds `auth.ts` and `dashboard.ts`). When adding a feature for a backend resource, follow this one-file-per-resource pattern.

### Pages: domains

Admin features live under [src/app/domains/](src/app/domains/), one folder per resource (exercises, students, teachers, lessons, lesson-books, modules, skills, stages, plans, news, podcasts, videos, resources, meetings, deliveries, cashflow, error-reports, notifications, users, etc.). These pages are almost all `'use client'`, manage state with React hooks, and call the axios services directly. The dashboard home ([src/app/page.tsx](src/app/page.tsx)) is the main Server Component exception, fetching its summary via `fetchBackendJson`.

### Auth flow

[src/lib/auth.ts](src/lib/auth.ts) configures NextAuth with the Keycloak provider, JWT session strategy (8h max), and **manual access-token refresh**: the `jwt` callback refreshes via Keycloak's `refresh_token` grant when within 60s of expiry, setting `token.error = 'RefreshAccessTokenError'` on failure (surfaced as `session.error`). The `signOut` event performs Keycloak RP-initiated logout. The handler is wired at [src/app/api/auth/[...nextauth]/route.ts](src/app/api/auth/[...nextauth]/route.ts). Use the `SessionWithAccessToken` type from [src/types/auth.ts](src/types/auth.ts) when reading `session.accessToken`.

### Shared UI

Reusable components are in [src/components/ui/](src/components/ui/) — notably `DataTable`, `TablePagination`, `ConfirmDeleteModal`, `LoadingOverlay`. The app shell (top nav, auth guard, logout) is `DashboardLayout` in [src/components/layout/](src/components/layout/); wrap page content in it. The Chakra theme (custom `primary` orange palette `#FDA91E`) is defined inline in `providers.tsx`.

### Other notes

- Path alias `@/*` → `src/*`.
- `/api/debug-api` and `/api/debug-session` are debugging-only routes.
- The root `exercices/` folder holds JSON seed/import data (root/branch/leaf/bud/seed `_all.json`) for bulk exercise import, used with the batch-upload UI on the exercises page.
- Deployment: `Dockerfile` (multi-stage, runs on port 3002) and Kubernetes manifests in [k8s/](k8s/). `NEXT_PUBLIC_*` vars are baked in at build time as Docker build args.
