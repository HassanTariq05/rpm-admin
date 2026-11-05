# PulsePoint — Remote Patient Monitoring Admin Starter

A modern, feature-oriented React admin dashboard starter for a Remote Patient Monitoring (RPM) product. This repository is intended as a development foundation, not a clinical system or a compliance-certified implementation.

## Stack

- **Vite + React + TypeScript** — quick local feedback and strict typing.
- **HeroUI v3** — accessible React Aria components with a compound API.
- **Tailwind CSS v4** — utility-first styling through the official Vite plugin.
- **TanStack Router** — type-safe client routing. The starter uses code-based routes so the route map is easy to understand and no generated route-tree file is needed.
- **TanStack Query** — server-state caching, stale times, retries, and Query Devtools in development.
- **TanStack Table** — headless patient directory table with global search and column sorting.
- **Vitest + Testing Library + jsdom** — fast unit/component test foundation.
- **Recharts** — responsive patient-engagement chart.
- **React Context** — demo auth/session shape and persisted display preferences. HeroUI v3 does not need a provider wrapper.
- **React Hook Form + Zod** — included for typed forms and runtime validation; an enrollment schema example is in `src/features/patients/patient.schema.ts`.
- **Lucide React, Sonner, date-fns, clsx, tailwind-merge, ESLint, and Prettier**.

HeroUI v3 requires React 19+ and Tailwind CSS v4. The stylesheet import order in `src/styles.css` is intentional: Tailwind is imported before `@heroui/styles`.

## Quick start

Requirements: Node.js 22.12+ and npm.

```bash
# 1. Unzip this project and enter its directory
cd rpm-admin-starter

# 2. Install the dependencies
npm install

# 3. Create local environment values (optional for the mock UI)
cp .env.example .env

# 4. Start Vite
npm run dev
```

Open the local URL Vite prints (usually `http://localhost:5173`).

## Commands

```bash
npm run dev          # local development server
npm run build        # type-check app + Vite config, then production bundle
npm run preview      # serve the production bundle locally
npm run typecheck    # TypeScript checks only
npm test             # one-shot test suite
npm run test:watch   # watch tests while developing
npm run lint         # ESLint
npm run format       # format project files
npm run format:check # verify formatting
```

## Folder structure

```text
src/
├── app/
│   ├── components/       # Shared UI primitives (PageHeader, StatusBadge, StatCard)
│   ├── context/          # Auth/session and appearance preferences
│   ├── layout/           # App shell, sidebar, top bar, outlet
│   └── providers.tsx     # Query client, contexts, toast, devtools
├── features/
│   ├── alerts/pages/     # Triage queue and local demo acknowledge/resolve
│   ├── dashboard/
│   │   ├── components/   # Recharts engagement visual
│   │   ├── data/         # Mock fixtures and query functions
│   │   └── pages/
│   ├── devices/pages/    # Device fleet and battery/connectivity states
│   ├── patients/         # Patient directory and enrollment validation schema
│   ├── reports/pages/    # Report library entry points
│   └── settings/pages/   # Appearance, account, and platform settings shell
├── lib/                  # Query client, environment validation, className utility
├── types/                # Domain-level interfaces and status unions
├── main.tsx              # Application entry
├── router.tsx            # Typed route definitions
└── styles.css             # Tailwind, HeroUI styles, theme variables
```

## Architecture notes

### Server state vs. client state

Use **TanStack Query** for API-backed state such as patients, alerts, readings, and connected devices. Each query has a stable key and a query function under `src/features`. Replace the mock functions in `src/features/dashboard/data/dashboard.api.ts` with a typed API client and keep HTTP concerns out of page components. When a mutation succeeds, invalidate the related query keys.

Use **React Context** for genuinely app-wide client state (current user/session shape and UI preferences). Avoid putting server data in Context: Query already handles caching, request lifecycle, and invalidation.

### Adding a route

1. Add a feature folder with a page component.
2. Register a `createRoute` in `src/router.tsx` and add it to `routeTree`.
3. Add a typed link to `navItems` / `pageTitles` in `src/app/layout/app-shell.tsx` if it belongs in global navigation.

### Device Readings

`/` opens Device Readings (`/device-readings` redirects there) and connects to the EMR readings API through `src/services/reading-services/reading-services.ts` and `src/hooks/useReadings.ts`. Configure `VITE_API_BASE_URL` for a different environment; the readings service appends `/emr/readings` to this shared `/api` root. The service forwards the signed-in session bearer token using the existing API client, validates responses, applies a 20-second timeout, and supports cancellation.

While Device Readings is mounted, `use-readings-realtime.ts` requests a short-lived ticket using the signed-in session bearer token and connects to the readings WebSocket. `vitals.refresh` events invalidate readings in the current account/organization and refetch the active page without changing its filters. Concurrent refreshes are deduplicated. Connections retry with exponential backoff (up to 30 seconds), obtain a fresh ticket each time, and refresh on connection to catch missed events. Leaving the page, signing out, or changing sessions closes the connection and cancels pending ticket requests/retries. Ticket responses with 401/403 stop retries until the session changes. Manual refresh remains available.

Realtime tickets use `/auth/realtime-ticket` on `VITE_API_BASE_URL`. Override `VITE_READINGS_WEBSOCKET_URL` for the separate WebSocket environment. Tokens and tickets are obtained at runtime and are never stored in frontend configuration.

The API must allow the deployed frontend origin (and `http://localhost:5173` during development) through CORS, including GET/POST requests and the Authorization header. Browser requests cannot succeed without those response headers.

Pagination and source filtering run on the server. The verified API does not apply the `readingType` parameter; search, type filtering, and sorting explicitly apply to the current server page. The page never silently downloads the entire collection. Opening Details exposes every returned metadata field and the full source payload. Missing patient IDs are shown as unassigned. Local timestamps use the device offset when canonical UTC timestamps are unavailable; displayed times identify the viewer's timezone. Unspecified measurement units are not inferred.

### API configuration

All HTTP services use `VITE_API_BASE_URL`, which defaults to
`https://rl9otvtzf6.execute-api.eu-north-1.amazonaws.com/api`.
Authentication, users, roles, and organizations define their `/auth/...` paths
in their service files; readings use `/emr/readings`, patients use `/patients/...`,
and devices use `/devices/...`. The same root powers account initialization and
realtime tickets. `VITE_READINGS_WEBSOCKET_URL` remains separate because it uses a
different host and the WebSocket protocol.

### Adding API access

A typical first integration is an API client using `fetch` (or your preferred HTTP client), a validated `VITE_API_BASE_URL`, and feature-specific query/mutation functions. `VITE_*` values are public browser config, **not secrets**. Do not place API keys, service credentials, private tokens, or PHI in frontend environment variables.

## RPM production-readiness checklist

Authentication, administration, and Device Readings use live APIs. Dashboard summaries, patient-directory examples, device-fleet cards, and alerts still use synthetic fixtures. Actions labelled demo remain placeholders. This frontend does not provide a clinical decision engine or replace backend authorization and auditing.

Before connecting real patient data, design and validate at least:

- A secured backend and identity provider; enforce permissions server-side (RBAC/least privilege) on every resource and action.
- Appropriate privacy/security controls for your jurisdictions and agreements, including encryption in transit and at rest, session expiry, secret management, audit logs, retention/deletion processes, and incident response.
- Patient consent and enrollment workflows, clinician assignment, program-specific thresholds, alert ownership/escalation, and a traceable review history.
- Data validation, source timestamps/time zones, unit normalization, out-of-order readings, device identity/provisioning, connectivity monitoring, duplicate handling, and retry/offline behavior.
- Clinical and usability review, accessibility tests, threat modeling, automated tests, backups, monitoring, and a deployment plan.

Do not use the demo alert rules or example readings to make clinical decisions. This starter is not, by itself, HIPAA-compliant or a substitute for a compliance/security assessment.

## Mock data

Fixture data is intentionally fake and localized in `src/features/dashboard/data/mock-data.ts`. All dashboard counts, charts, patient list entries, devices, and alerts come from these fixtures. It is safe to replace these with API responses once your backend is ready; do not add real patient information to the fixtures or source control.

## Useful next implementation steps

1. Authentication + route guards backed by a real identity provider.
2. API client, request/response types, and error normalization.
3. Patient enrollment/profile workflow using React Hook Form + Zod.
4. Reading history with clinically reviewed thresholds and event/audit history.
5. Role-aware triage mutations with optimistic or invalidation-based UI updates.
6. Automated tests for critical paths and accessibility.

## App icons and link previews

`index.html` includes the favicon, touch icons, web manifest, Open Graph metadata, and X/Twitter large-image card metadata. Sharing URLs use `https://rpm.inforcodes.com/`; update the canonical URL and absolute image URLs if the public domain changes.

The share image is `public/social-preview.png` (1200 × 630), with editable artwork in `public/social-preview.svg`. Icon artwork is in `public/favicon.svg`. These static assets must remain publicly accessible so sharing services can fetch them before sign-in. Changes become available after deploying the build; sharing platforms may cache previous previews.

## Languages

The interface supports English (default) and Spanish through `i18next` and
`react-i18next`. The language picker is available in the app header and on sign-in
and account recovery screens. The choice is stored under `rpm-language`; storage
failures fall back to a session-only choice. The root `lang` attribute and React
Aria locale follow the selected language.

Translations live in `src/i18n/locales/en.json` and `es.json`. English source text
is the translation key (`keySeparator` and `nsSeparator` are disabled). Add each
new UI message to both catalogs. Use interpolation for dynamic values and
`_one`/`_other` keys with `count` for plural messages. Components subscribe through
`useAppTranslation`; `translate` is also available for notifications and display
labels outside React. Unknown server messages fall back to their original text.

Translate display labels only: keep API enum values, permission codes, identifiers,
patient names, and user-entered content intact. Date and number helpers resolve the
current locale at formatting time; changing language does not change timezones.
Patient CSV/Excel exports use the selected language for headings and status labels.

Run localization/export checks with:

```sh
npm test -- src/i18n/i18n.test.ts src/features/patients/patients-export.test.ts --environment node
```

## Patient service

The patient service appends `/patients/`, `/patients/org/{orgId}`, and
`/patients/{id}` to the shared `VITE_API_BASE_URL`. Patient queries and mutations use the
signed-in bearer token, scoped React Query keys, cancellation, and response
validation. Super Admin can list all patients; other users use their organization's
listing. The API returns the complete matching list, so search and pagination are
performed locally.

Patient forms save the documented demographic fields and `isActive`. Clinician,
clinical-risk status and last-reading values are not supplied by this API; the UI
uses Active/Inactive and does not invent missing clinical data. CSV and Excel export
the filtered API records.

For browser access, the patient gateway/service must answer unauthenticated CORS
`OPTIONS` preflight requests successfully **before** bearer-token authentication.
Allow the frontend origin,
Authorization and Content-Type headers, and the documented methods; actual CRUD
requests should continue to require authentication.

## Device inventory service

The device service appends `/devices/` and `/devices/{id}` to the shared
`VITE_API_BASE_URL`, preserving the gateway endpoints `/api/devices/` and
`/api/devices/{id}`.
The device service uses the existing authenticated Axios client, cancellation,
response validation, account/organization-scoped React Query keys, and mutation
toasts. Saving invalidates both inventory and detail queries. The API returns the
complete matching list, so catalog filters, text search, and pagination run locally.

Forms send `deviceModel`, `imei`, `externalDeviceId`, `vendor`, `deviceType`, and
`isActive`; clearing optional text fields sends null. They preserve existing vendor
and type values, including values outside the suggested choices. Device names use
the model, with the type as a fallback. The service does not supply patient
assignments, names, serial numbers, or notes; the UI does not fabricate them.
Device cards retain a patient row labeled “Not provided” pending an assignment API.

The gateway must allow browser CORS preflight for this service mount, including the
Authorization and Content-Type headers and GET/POST/PUT methods, before requiring
bearer authentication on the actual requests.
Device integration checks:

```bash
npm test -- src/features/devices src/services/device-services src/hooks/use-devices.test.tsx
```
