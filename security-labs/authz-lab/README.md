# AuthZ Lab

A deliberately vulnerable, multi-tenant application for practicing one skill: **spotting the missing authorization decision.**

Every flaw in this lab exists in two forms, a vulnerable implementation and a secure one, switchable with a single flag. The point is not to memorize payloads. The point is to look at a request and ask: *who is acting, on what, in which tenant, in which state, and where is that checked?*

> **Warning:** This application is intentionally insecure. Run it only on an isolated local machine or VM. Never expose it to the internet, never deploy it, and never reuse real credentials or data in it.

## What's inside

**Actors:** user, manager, administrator, across separate organizations (tenants).

**Surface:**
- REST (v1 and v2) and GraphQL
- Numeric and UUID object identifiers
- Invitation and password-reset workflows
- Soft deletion and approval states (draft, submitted, approved, published)
- File access and export/download
- Role changes
- Webhooks
- Concurrent request handling

## Flaw catalog

Each flaw has a toggle (`FLAW_<NAME>=on|off`), a test, and a write-up in `docs/`.

| # | Flaw | The missing decision |
|---|------|----------------------|
| 1 | Horizontal IDOR | Does this object belong to the caller? |
| 2 | Vertical privilege escalation | Does the caller's role permit this action? |
| 3 | Cross-tenant access | Is the object inside the caller's organization? |
| 4 | Missing authz on alternate HTTP methods | Is policy enforced per method, not just per route? |
| 5 | Hidden endpoint access | Is "unlinked" being mistaken for "protected"? |
| 6 | Workflow-step skipping | Is this transition valid from the current state? |
| 7 | Stale invitation | Is the invite still valid for its role, org, and time? |
| 8 | Role-downgrade persistence | Do old tokens still carry the old role? |
| 9 | Race condition | Is the check-then-act sequence atomic? |
| 10 | Mass assignment | Which fields is the caller allowed to set? |
| 11 | GraphQL field authorization failure | Is authorization enforced per field, not just per query? |
| 12 | File/object mismatch | Does the file belong to the object being requested? |
| 13 | Deprecated API authorization gap | Does the old version enforce what the new one does? |

## How to use it

1. Start the lab with all flaws **on**.
2. Pick a flaw, map the endpoints, and write down who *should* be able to do what.
3. Find where reality disagrees with that expectation.
4. Read the docs entry, flip the flag **off**, and study the diff.
5. Run the tests to confirm the attack works with the flaw on and is blocked with it off.

## The authorization matrix

`tests/matrix.test.ts` runs every actor (anonymous, user, manager, admin, other-tenant admin) against every endpoint and compares the results to an expected grid. Any cell that disagrees is an authorization bug. This is the habit to carry into real targets.

## Stack

Node.js, Express, Apollo Server (GraphQL), PostgreSQL, TypeScript, Vitest, Docker Compose.

## Quick start (Linux VM)

```bash
docker compose up -d        # Postgres, bound to 127.0.0.1 only
npm install
npm run db:seed             # 2 orgs x 3 roles, sample documents and files
npm run dev
```

Seeded accounts and credentials are listed in `docs/accounts.md`.

## Project layout

```
authz-lab/
  src/
    policy/       # central authorize(actor, action, resource)
    routes/v1/    # legacy REST
    routes/v2/    # current REST
    graphql/      # schema and resolvers
    flaws/        # vulnerable and secure implementations per flaw
  tests/          # per-flaw tests and the authorization matrix
  docs/           # one write-up per flaw
  docker-compose.yml
```

## Rules of the lab

- Never copy a vulnerable pattern into real projects.
- Never test techniques from this lab against systems you do not own or have explicit permission to test.
- Every finding gets a write-up: the missing decision, the impact, and the fix.
