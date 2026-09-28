# Clinic SaaS Starter

A production-ready, **multi-tenant clinic management platform** built with
Next.js 16, React 19, TypeScript and MongoDB. It ships with the parts that
normally take months to build: tenant isolation, role-based access, a patient
portal, subscription billing, appointment reminders, and a bilingual
Arabic/English interface with full RTL support.

Use it as the foundation for your own clinic SaaS, or deploy it for a single
practice.

> **Healthcare disclaimer.** This is developer source code, not a certified
> medical system. It is not HIPAA- or GDPR-certified and is not a medical
> device. You are responsible for meeting the regulatory, security, and
> privacy obligations that apply to your deployment. See
> [LICENSE.md](LICENSE.md), Section 6.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Seeding data](#seeding-data)
- [User roles](#user-roles)
- [Optional integrations](#optional-integrations)
- [Project structure](#project-structure)
- [Deployment](#deployment)
- [Customization](#customization)
- [Troubleshooting](#troubleshooting)
- [License and support](#license-and-support)

---

## Features

### Multi-tenancy and administration
- Every record is scoped to a clinic, so one deployment serves many practices.
- Clinic self-registration flow with its own onboarding.
- **Super-admin panel** spanning all tenants: clinics, users, patients,
  subscription plans, active subscriptions, and a full audit log.
- Audit logging of sensitive actions, queryable from the super-admin panel.

### Clinical workflows
- **Patients** — records, history, contact details, attached documents.
- **Appointments** — list view plus a drag-and-drop calendar (FullCalendar)
  with day, week, and month modes, and built-in double-booking detection.
- **Visits** — clinical notes, diagnoses, follow-up scheduling, and optional
  AI-assisted visit summaries.
- **Prescriptions** — issue, view, and export to PDF.
- **Medical documents** — per-patient file attachments.
- **Video consultations** — room-based video visits for staff and patients.

### Patient portal
A separate, independently authenticated front end where patients can register,
book appointments, view their visit history and prescriptions, join video
consultations, and manage their profile.

### Billing
- PayPal subscription billing with plan management, checkout, verification,
  cancellation, and signed webhook handling.
- Subscription plans defined and priced from the super-admin panel.
- Per-clinic subscription state gates access to the dashboard.

### Notifications and reporting
- In-app notification centre with unread counts.
- Automated appointment reminders over email and WhatsApp, driven by a secured
  cron endpoint — see [APPOINTMENT_REMINDERS_SETUP.md](APPOINTMENT_REMINDERS_SETUP.md).
- Transactional email for password resets and account events.
- Analytics dashboard and exportable reports (Recharts, jsPDF).

### Interface
- Bilingual **Arabic and English**, with full right-to-left layout support.
  Arabic is the default locale; a visitor's choice is remembered.
- Light and dark themes.
- Responsive across desktop, tablet, and mobile.
- Accessible component set built on Radix UI and Tailwind CSS.
- Marketing landing page with a "request a demo" flow.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript 5 |
| Database | MongoDB with Mongoose 9 |
| Staff auth | NextAuth v4 (credentials provider) |
| Patient auth | Standalone JWT session layer |
| Styling | Tailwind CSS 3, Radix UI, `lucide-react` |
| Forms | React Hook Form + Zod |
| Calendar | FullCalendar |
| Charts | Recharts |
| PDF | jsPDF + autotable |
| Payments | PayPal REST (subscriptions) |
| Messaging | Nodemailer (SMTP), Twilio (WhatsApp) |
| AI | OpenAI (optional) |

---

## Architecture

**Two separate authentication systems.** Clinic staff sign in through NextAuth
(`src/lib/auth.ts`), and patients sign in through an independent JWT layer
(`src/lib/portalAuth.ts`) with its own secret. A patient can never obtain a
staff session, and the two never share cookies. Keep `NEXTAUTH_SECRET` and
`PORTAL_JWT_SECRET` distinct.

**Tenant isolation.** Every tenant-owned model carries a `clinicId`. API
routes resolve the caller's clinic from their session and scope queries to it;
`super_admin` accounts carry no `clinicId` and may query across tenants.
When you add a model, carry `clinicId` through and scope every query by it.

**Authorization.** Route handlers authenticate through `src/lib/apiAuth.ts`
and check capabilities defined in `src/lib/permissions.ts`.

**Graceful degradation.** Email, WhatsApp, AI summaries, and billing are all
optional. With their keys unset the app still runs: emails and WhatsApp
messages are logged to the server console, and AI summaries fall back to a
summary generated from the visit record itself.

---

## Quick start

### Prerequisites

- **Node.js 20 or newer**
- **MongoDB** — a local instance, or a free
  [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster
- npm (or your preferred package manager)

### Install

```bash
npm install
```

### Configure

```bash
cp .env.example .env.local
```

Open `.env.local` and set the four required values. Generate the two secrets
with:

```bash
openssl rand -base64 32
```

At minimum you need `MONGODB_URI`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, and
`PORTAL_JWT_SECRET`. Everything else is optional and can be added later.

### Create the first administrator

```bash
npm run seed:superadmin
```

Set `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` in `.env.local` first, or
the script falls back to its built-in defaults — which you must not use on a
public deployment.

### Run

```bash
npm run dev
```

Open <http://localhost:3000>. Sign in at `/login` with the super-admin
credentials you just seeded, then create your first clinic from the
super-admin panel or register one at `/register`.

---

## Environment variables

Every variable is documented inline in [.env.example](.env.example). Summary:

| Variable | Required | Purpose |
|---|---|---|
| `MONGODB_URI` | **Yes** | MongoDB connection string |
| `NEXTAUTH_SECRET` | **Yes** | Signs staff sessions |
| `NEXTAUTH_URL` | **Yes** | Canonical URL; must match the browser origin |
| `PORTAL_JWT_SECRET` | **Yes** | Signs patient-portal sessions |
| `NEXT_PUBLIC_APP_URL` | Recommended | Base URL for links in outgoing messages |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | No | Outgoing email; logs to console when unset |
| `SALES_NOTIFICATION_EMAIL` | No | Inbox for landing-page demo requests |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_WHATSAPP_FROM` | No | WhatsApp reminders; logs to console when unset |
| `CRON_SECRET` | No | Required before the reminder cron will run |
| `OPENAI_API_KEY` | No | AI visit summaries; falls back to a generated summary |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` / `PAYPAL_MODE` / `PAYPAL_WEBHOOK_ID` | No | Subscription billing |
| `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` / `SUPER_ADMIN_NAME` | No | Read only by the seed script |

---

## Seeding data

| Command | Effect |
|---|---|
| `npm run seed:superadmin` | Creates (or upgrades) the cross-tenant super-admin account |
| `npm run seed` | Creates a clinic administrator account |
| `npm run demo:seed` | Creates a fully populated demo clinic — staff, patients, appointments, and visits |
| `npm run demo:clear` | Removes the demo clinic and everything attached to it |

The demo seed is scoped to a single clinic slug, so teardown is exact and
never touches other tenants. Use it for screenshots, for a public demo
deployment, and to explore the app before entering real data.

Maintenance scripts:

| Command | Effect |
|---|---|
| `npm run audit:subscriptions` | Reports subscription records with no matching PayPal agreement |
| `npm run paypal:resync-plans` | Re-synchronizes local plans with PayPal |

---

## User roles

| Role | Scope | Capabilities |
|---|---|---|
| `super_admin` | All clinics | Everything, plus clinics, plans, subscriptions, audit logs |
| `admin` | One clinic | Staff, patients, appointments, billing, settings |
| `doctor` | One clinic | Visits, prescriptions, own schedule, assigned patients |
| `receptionist` | One clinic | Patients, appointments, scheduling |
| Patient | Own records | Portal only: booking, own history, prescriptions, video visits |

Capability checks live in `src/lib/permissions.ts`.

---

## Optional integrations

Each is inert until configured, and none blocks startup.

**Email (SMTP).** Set the five `SMTP_*` variables. Any provider works —
SendGrid, Mailgun, Postmark, Amazon SES, or a Gmail app password for testing.
Verify delivery at `/api/health/email`.

**WhatsApp (Twilio).** Set the three `TWILIO_*` variables. Start with the
Twilio WhatsApp sandbox; production use requires an approved sender and
message templates.

**Appointment reminders.** Set `CRON_SECRET`, then schedule a request to
`/api/cron/appointment-reminders` carrying that secret. Full instructions,
including Netlify scheduled functions, are in
[APPOINTMENT_REMINDERS_SETUP.md](APPOINTMENT_REMINDERS_SETUP.md). The endpoint
refuses to run while `CRON_SECRET` is unset, so reminders cannot fire by
accident.

**PayPal billing.** Create an app in the
[PayPal developer dashboard](https://developer.paypal.com/dashboard/applications),
set the four `PAYPAL_*` variables, and register a webhook pointing at
`/api/subscriptions/webhook`. Credentials must match `PAYPAL_MODE` — sandbox
keys fail against the live endpoint and vice versa. Create your plans in the
super-admin panel, then run `npm run paypal:resync-plans`.

**OpenAI summaries.** Set `OPENAI_API_KEY`. Without it the visit summary
endpoint still works, returning a summary assembled from the visit record.

---

## Project structure

```
src/
├── app/
│   ├── (auth)/            Staff login, registration, password reset
│   ├── api/               Route handlers
│   │   ├── auth/          Staff authentication, clinic registration
│   │   ├── portal/        Patient portal API (separate auth)
│   │   ├── super-admin/   Cross-tenant administration
│   │   ├── subscriptions/ PayPal checkout, verification, webhooks
│   │   ├── cron/          Scheduled appointment reminders
│   │   └── ...            Patients, appointments, visits, prescriptions
│   ├── dashboard/         Clinic staff dashboard
│   ├── portal/            Patient-facing portal
│   ├── super-admin/       Super-admin panel
│   └── video/             Video consultation rooms
├── components/            Shared and UI components
├── lib/
│   ├── auth.ts            NextAuth configuration (staff)
│   ├── portalAuth.ts      Patient JWT sessions
│   ├── apiAuth.ts         Route-handler auth helpers
│   ├── permissions.ts     Role capability checks
│   ├── db.ts              Mongoose connection (cached)
│   ├── i18n/              Translations and locale context
│   ├── email.ts           SMTP with console fallback
│   ├── whatsapp.ts        Twilio with console fallback
│   ├── paypal.ts          PayPal REST client
│   └── seed*.ts           Seed scripts
└── models/                Mongoose schemas
```

---

## Deployment

The app runs anywhere Next.js 16 runs. A Netlify configuration
(`netlify.toml`, with `@netlify/plugin-nextjs`) is included; Vercel, Railway,
Render, and a self-hosted Node server all work equally well.

Before going live:

1. Set every required environment variable in your host's dashboard — never
   commit `.env.local`.
2. Generate **fresh** `NEXTAUTH_SECRET` and `PORTAL_JWT_SECRET` values for
   production. Do not reuse development secrets.
3. Set `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to your production URL.
4. Switch `PAYPAL_MODE` to `live` and swap in live credentials.
5. Restrict MongoDB network access to your host, and use a least-privilege
   database user.
6. Change the seeded super-admin password.
7. Schedule the reminder cron if you want reminders.
8. Run `npm run build` locally first to catch type errors.

---

## Customization

**Branding.** Application name and logo live in the shared layout and landing
page components; colors and typography in `tailwind.config.js` and the global
stylesheet.

**Translations.** Edit `src/lib/i18n/locales/en.json` and `ar.json`. To add a
language, drop in a new JSON file, register it in `src/lib/i18n/index.tsx`,
and add it to `RTL_LOCALES` if it reads right to left. Change `DEFAULT_LOCALE`
in the same file to lead with a different language.

**Adding a model.** Create the schema in `src/models/`, include `clinicId`,
add a route handler under `src/app/api/`, authenticate via `apiAuth.ts`, and
scope every query by the caller's clinic.

---

## Troubleshooting

**`Please define the MONGODB_URI environment variable`** — `.env.local` is
missing or the variable is empty. Copy it from `.env.example`.

**Sign-in redirects back to the login page** — `NEXTAUTH_URL` does not match
the origin in the browser address bar. It must match exactly, including
protocol and port.

**`PayPal auth failed against the sandbox endpoint`** — your credentials
belong to the other environment. Align `PAYPAL_MODE` with the key pair.

**Emails and WhatsApp messages never arrive** — if SMTP or Twilio is
unconfigured, both are written to the server console by design. Check the
terminal running the dev server.

**Reminders never fire** — `CRON_SECRET` is unset, or the scheduled request
does not carry it. The endpoint refuses to run without it.

---

## License and support

Commercial software, sold under the End User License Agreement in
[LICENSE.md](LICENSE.md). Read it before deploying — Section 6 covers
healthcare and regulatory responsibilities, and Section 3 sets out what you
may not do with the source.

Support: [YOUR SUPPORT EMAIL]

Copyright © [YEAR] [YOUR LEGAL NAME OR COMPANY]. All rights reserved.
