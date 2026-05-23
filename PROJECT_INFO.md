# Rent App — Project Info

Critical and important information about the Rent App project. Read this before contributing or debugging.

---

## 1. Overview

A rent / property management web app branded **"Xwegbe Vivi"**, targeting the **Benin** real-estate market (currency **XOF / CFA franc**, time zone **Africa/Porto-Novo**, French + Fongbe localization).

Three user roles share one app:

| Role | Entry point | Capabilities |
|---|---|---|
| **Tenant** | `/tenant` | View lease, sign lease, pay rent, request repairs |
| **Landlord** | `/dashboard` | Manage properties / units / tenants / listings / expenses / repairs, view financials |
| **Admin** | `/admin` | Platform-level oversight, manage users, override billing |

Public pages: `/`, `/listings`, `/apply`, `/login`.

---

## 2. Tech Stack

### Frontend
- **React 19** + **Vite 7** + **TypeScript ~5.9**
- **Firebase 12** (Auth, Firestore w/ offline persistence, Storage, Functions, Analytics)
- **react-router-dom 7** — routing
- **react-i18next 16** — 3 languages: `en`, `fr`, `fon` (Fongbe)
- **@stripe/react-stripe-js 5** — card payments
- **fedapay-reactjs 1** — mobile money (peer-conflicts with React 19, see Gotchas)
- **recharts 3** — charts in financial reports
- **react-hot-toast** — toasts
- **jspdf** — PDF lease generation
- **vite-plugin-pwa** — PWA support

### Backend (`functions/`)
- **Firebase Functions Gen 2**, **Node 22**
- **Stripe 20** — payment intents
- **OpenAI 6** — AI listing description generator
- **nodemailer 7** — email receipts (Gmail)
- **firebase-admin 13**

### Testing
- **Vitest 4** + **jsdom 27** + **@testing-library/react 16** — frontend (`npm test`)
- **Jest 30** + **ts-jest** + **firebase-functions-test** — backend (`cd functions && npm test`)
- **@vitest/coverage-v8** — coverage (note: known 0% reporting issue, see Gotchas)

---

## 3. Firebase Project

- **Project ID:** `rentapp-baa9c`
- **Hosting site:** `rentapp-baa9c`
- **Region/time zone for scheduled jobs:** `Africa/Porto-Novo`
- Hosting serves `dist/` with `no-cache` headers (SPA: all routes rewrite to `/index.html`)
- `firebase.ts` initializes Firestore with `persistentLocalCache()` for offline support

### Firestore Collections

| Collection | Owner field | Public read? | Notes |
|---|---|---|---|
| `users` | `uid` | No | Role-based (`tenant` / `landlord` / `admin`); auto-created on first login |
| `properties` | `ownerId` | Auth required | Buildings / complexes |
| `units` | `ownerId` | Auth required | Units within properties |
| `tenants` | `ownerId` | Owner / tenant / admin | Linked to user by `email` |
| `listings` | `ownerId` | **Yes — public** | For public `/listings` page |
| `applications` | `ownerId` | **Public create**, owner read | From `/apply` page (no auth needed to submit) |
| `expenses` | `ownerId` | Owner / admin | Landlord cost tracking |
| `repairs` | `ownerId` + `tenantId` | Tenant / owner / admin | Maintenance requests |
| `billingHistory` | `ownerId` | Owner / admin | Auto-billing audit log; admin-only update/delete |

All rules in `firestore.rules`. Helper functions: `isAuthenticated()`, `isAdmin()`, `isLandlord()`, `isOwner(ownerId)`.

---

## 4. Cloud Functions (`functions/src/index.ts`)

| Function | Type | Secrets | Purpose |
|---|---|---|---|
| `createPaymentIntent` | `onCall` | `STRIPE_SECRET_KEY` | Creates Stripe PaymentIntent in **XOF (zero-decimal)** |
| `generateListingDescription` | `onCall` | `OPENAI_API_KEY` | GPT-3.5-turbo writes French listing copy (with fallback if AI fails) |
| `emailReceipt` | `onCall` | `EMAIL_USER`, `EMAIL_PASS` | Sends HTML payment receipt via Gmail SMTP |
| `scheduledMonthlyBilling` | `onSchedule` (`0 0 1 * *`, Africa/Porto-Novo) | — | Adds `monthlyRent` to long-term tenant balances on the 1st; double-billing protection via `billingHistory` lookup |

### Required Firebase Secrets

Set via `firebase functions:secrets:set <NAME>`:

- `STRIPE_SECRET_KEY`
- `OPENAI_API_KEY`
- `EMAIL_USER` (Gmail address)
- `EMAIL_PASS` (Gmail app password)

**XOF is zero-decimal** — don't multiply by 100 when creating Stripe charges.

---

## 5. Setup

```bash
# Frontend
npm install --legacy-peer-deps    # REQUIRED — see Gotchas
npm run dev                       # http://localhost:5173
npm test
npm run lint
npm run build                     # outputs to dist/

# Backend functions
cd functions
npm install
npm run build                     # tsc -> lib/
npm test
npm run serve                     # emulators on :5001 (functions), :5000 (hosting)

# Deploy
firebase deploy                   # everything
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
```

---

## 6. CI / CD (GitHub Actions)

Located in `.github/workflows/`:

- **`ci.yml`** — runs on every push and PR to `main`: install, lint, test, build (frontend + functions). Uses Node 22, `NODE_OPTIONS=--max-old-space-size=4096` for tests.
- **`deploy.yml`** — runs on push to `main`: builds and deploys hosting + functions + Firestore rules.

### Required GitHub Secrets

- `FIREBASE_SERVICE_ACCOUNT` — JSON service-account key (for hosting action)
- `FIREBASE_TOKEN` — for `firebase-tools deploy` (functions + rules)

> Note: `ci.yml` runs `npm ci` which does **not** honor `--legacy-peer-deps`. If install fails in CI, add `.npmrc` with `legacy-peer-deps=true`.

---

## 7. Routing (`src/App.tsx`)

| Path | Access | Component |
|---|---|---|
| `/` | Public | `HomePage` |
| `/listings` | Public | `Listings` |
| `/apply` | Public | `PublicApply` |
| `/login` | Public | `LoginPage` |
| `/dashboard` | Authed | Routes by role: admin → `/admin`, landlord → `LandlordDashboard`, tenant → `/tenant` |
| `/admin` | Authed admin | `AdminDashboard` |
| `/tenant` | Authed tenant | `TenantPortal` (requires matching `tenants` doc by email) |

Auth flow: on first login a `users/{uid}` doc is auto-created. Role defaults to `landlord` unless a matching `tenants` doc exists by email — then `tenant`. Admin role must be assigned manually in Firestore.

---

## 8. Key File Paths

| Purpose | Path |
|---|---|
| Main app / routing | `src/App.tsx` |
| Firebase init (incl. config) | `src/firebase.ts` |
| Type definitions | `src/types.ts` |
| Landlord dashboard (biggest, ~1500 lines) | `src/LandlordDashboard.tsx` |
| Tenant portal | `src/TenantPortal.tsx` |
| Admin dashboard | `src/AdminDashboard.tsx` |
| Financial reports | `src/FinancialReports.tsx` |
| Signature pad (lease signing) | `src/SignaturePad.tsx` |
| Backend functions | `functions/src/index.ts` |
| Firestore rules | `firestore.rules` |
| Translations | `src/i18n/locales/{en,fr,fon}/{common,landlord,tenant,public,admin}.json` |
| Test setup | `src/setupTests.ts` |
| Test factories / mocks | `src/test-utils.ts` |

---

## 9. Test Infrastructure

- **Frontend:** ~151 tests across 16 files (all passing as of Feb 2026)
- **Backend:** 11 tests in `functions/src/index.test.ts`
- **Total:** ~162 tests
- `src/setupTests.ts` initializes i18n with **English** translations — assertions must match actual i18n values, not hardcoded text
- Console error/warn spy in `setupTests` **fails tests on unexpected console output** (use `SUPPRESSED_WARNINGS` patterns to ignore expected ones)
- `afterEach` runs `cleanup()` + `vi.restoreAllMocks()`
- Mock factories in `src/test-utils.ts`: `mockUser`, `mockTenant`, `mockProperty`, `mockExpense`, etc.

---

## 10. Critical Gotchas

### Install / Build
- **`npm install --legacy-peer-deps` is mandatory** — `fedapay-reactjs` declares an older React peer dependency that conflicts with React 19.
- `tsconfig.app.json` excludes `*.test.*` files and `test-utils.ts` from the build.

### Currency
- **XOF (CFA franc) is zero-decimal.** Stripe `amount` is the literal CFA value — do **not** multiply by 100.

### Billing
- `scheduledMonthlyBilling` runs at `0 0 1 * *` in `Africa/Porto-Novo`.
- Double-billing protection: it checks `billingHistory` for the current `YYYY-MM` before charging.
- Short-term tenants are **skipped** (`tenant.type === "short-term"`).

### i18n
- Translation strings change frequently — **always check `src/i18n/locales/en/*.json`** before writing test assertions.
- All 3 languages (`en`, `fr`, `fon`) must be updated together when adding keys.

### Test Patterns
- `expect.anything()` does **not** match `undefined` — inspect `mock.calls[0]` directly when checking nullable args.
- Components render dual layouts (desktop table + mobile cards) in jsdom → use `getAllByText`, not `getByText`.
- Canvas tests must return a **shared mock context object** from `getContext` (not a new object per call) — otherwise `SignaturePad` assertions fail.
- Forms with `required` inputs may not auto-validate in jsdom → fill **all** required fields explicitly.
- Coverage shows 0% under v8 due to `vi.mock()` hoisting — known Vitest limitation, not a real coverage gap.

### Hosting Cache
- `firebase.json` sets `Cache-Control: no-cache, no-store, must-revalidate` on all hosting responses — clients always pull fresh.

### Secrets / Sensitive Files
- `src/firebase.ts` contains the public Firebase web config (apiKey, projectId, etc.). These are **not secret** — they are safe to commit. Real secrets live in Firebase Secret Manager (see §4).
- `.gitignore` excludes `coverage/`, `.claude/`, `node_modules`, `dist`, `*.local`, `*.log`.

---

## 11. Repo & Branch

- **Remote:** `https://github.com/engobo3/rent-app.git`
- **Default branch:** `main`
- CI and deploy both trigger on push to `main`.

---

## 12. Quick Reference Commands

```bash
# Dev loop
npm run dev                                       # frontend on :5173
cd functions && npm run serve                     # emulators

# Test
npm test                                          # frontend (vitest run)
cd functions && npm test                          # backend (jest)

# Deploy single piece
firebase deploy --only hosting
firebase deploy --only functions:emailReceipt     # one function only
firebase deploy --only firestore:rules

# Logs
firebase functions:log

# Secrets
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:access STRIPE_SECRET_KEY
```
