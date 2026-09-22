# Phase 1 — modular monolith

## What's built
- Schema: orgs (with subsidiaries), users, memberships, documents + revisions,
  invitations, password_resets, files, exports, webhooks, audit_log.
- Central `authorize()` policy function (`src/policy/authorize.ts`) returning
  the `Decision` type, logging every call to `audit_log`.
- Flaw toggles in `src/flaws.ts`, driven by env vars, with a `SECURE_MODE`
  master switch.
- One real route wired end to end: `GET /api/v1/orgs/:orgId/documents/:id`,
  demonstrating flaw 1 (IDOR), flaw 2 (vertical escalation on reads),
  and flaw 3 (cross-tenant access).
- Seed script with 2 tenants x 5 roles, a subsidiary, and sample documents/files.
- Matrix test skeleton (`tests/matrix.test.ts`).

## Try it
```bash
docker compose up -d
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

Then, with the vulnerable flaws on (default), request Acme's document while
authenticated as a Globex member and pass Acme's `orgId` in the URL — the
`FLAW_CROSS_TENANT` branch in `authorize()` lets a mismatched membership
through. Set `SECURE_MODE=true` in `.env` and repeat: it's denied.

## Not yet built (later phases)
GraphQL, REST v2, workers/queues, file storage + signed URLs, OAuth/
integrations, service separation, and the remaining 10 flaws' routes.
The policy layer and schema already have the fields (token_version, document
state machine, invitation status, file.document_id) those phases will use.
