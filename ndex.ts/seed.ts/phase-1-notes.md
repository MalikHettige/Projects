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
- Invitation routes (`src/routes/invitations.ts`):
  `POST /api/v1/orgs/:orgId/invitations` (admin+ creates an invite, token
  returned in the response — no real email system) and
  `POST /api/v1/invitations/:token/accept` (authenticated caller redeems
  a token into membership). Demonstrates flaw 9 (race condition — the
  pending/expiry check and the write that consumes it are separate round
  trips, with an explicit delay, so concurrent accepts on the same token
  from different accounts can both succeed) and flaw 10 (stale invite
  acceptance — an already-expired/revoked/accepted token is still treated
  as valid). The two flaws are independently toggled; see the route file's
  top comment for exactly how they compose.
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
integrations, service separation, and the remaining 4 flaws' routes
(altMethods, massAssignment, fileObjectMismatch, deprecatedApiGap).
The policy layer and schema already have the fields (token_version, document
state machine, file.document_id) those phases will use.

## Testing the invitation flaws (manual, cold)
1. `npm run db:seed` logs three ready-to-use tokens: `pendingToken`,
   `expiredToken`, `revokedToken`.
2. **Stale invite (single request, no concurrency needed):** mint tokens
   for two different accounts (`scripts/mint-token.ts <userId>`), POST
   `/api/v1/invitations/<expiredToken>/accept` or `.../<revokedToken>/accept`
   as either — with the flaw on, it succeeds anyway.
3. **Race condition (needs real concurrency — Burp Turbo Intruder or an
   equivalent parallel-send tool, not sequential curl):** mint tokens for
   two *different* accounts. Fire `POST /api/v1/invitations/<pendingToken>/accept`
   from both at the same time. With the flaw on, check `memberships` after —
   if both accounts ended up as members of org A, the single-use token was
   redeemed twice. Sequential requests won't reproduce this; the second one
   will correctly 409 once the first's UPDATE has landed.
