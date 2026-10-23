# Security Labs

Local-only practice applications for learning web security.

> These labs intentionally contain vulnerabilities. Run them only on your own machine, bind them to loopback, and never reuse real credentials or data.

## Real architecture labs

These model realistic application backends, built to be chained — a flaw found in one feature is meant to unlock access into another. This is where actual training reps happen.

| Lab | Learning focus | Start here |
|---|---|---|
| [AuthZ](authz-lab/README.md) | Multi-tenant authorization decisions (Lab 1 of 3) | `cd authz-lab` |

Labs 2 and 3 (infra/SSRF-focused, OAuth-platform-focused) are scoped but not yet built.

## Concept primers

Small, single-file, single-vulnerability demos — useful for a quick 10-minute "see the mechanism once" pass on a topic before or after a PortSwigger learning path. These are **not** chainable and are not counted as real lab reps. Each uses only Node.js built-ins, demonstrates one flaw with a vulnerable/secure toggle (`LAB_MODE=secure`), and has its own test suite. They are local-only synthetic simulations — several never make real network calls, parse real HTTP traffic, or use an external cache — so no finding or bounty outcome is implied.

| Primer | Topic | Start here |
|---|---|---|
| [Authentication](_concept-primers/authentication-lab/README.md) | Session rotation and server-side logout | `cd _concept-primers/authentication-lab` |
| [Information Disclosure](_concept-primers/information-disclosure-lab/README.md) | Unintended response, file, and error leakage | `cd _concept-primers/information-disclosure-lab` |
| [JWT](_concept-primers/jwt-lab/README.md) | Signature, algorithm, and claim validation | `cd _concept-primers/jwt-lab` |
| [CORS](_concept-primers/cors-lab/README.md) | Browser-enforced cross-origin response access | `cd _concept-primers/cors-lab` |
| [SSRF](_concept-primers/ssrf-lab/README.md) | Server-side URL handling and internal-service boundaries | `cd _concept-primers/ssrf-lab` |
| [HTTP Request Smuggling](_concept-primers/request-smuggling-lab/README.md) | Front-end/back-end HTTP framing disagreement | `cd _concept-primers/request-smuggling-lab` |
| [Insecure Deserialization](_concept-primers/deserialization-lab/README.md) | Trust boundaries around serialized JSON data | `cd _concept-primers/deserialization-lab` |
| [Web Cache Poisoning](_concept-primers/cache-poisoning-lab/README.md) | Cache-key and response-input mismatches | `cd _concept-primers/cache-poisoning-lab` |
## What am I hunting here exactly?
My aim is to become fluent in hunting critical chains and bugs. Need to do these enough times for me to feel like muscle memory. I start hunting right after I turned 18 on January 13 2027.

**Single-exploit criticals**
- [ ]  IDOR on password reset/account recovery → zero-auth ATO
- [ ]  IDOR on admin/internal endpoints leaked via JS bundle
- [ ]  Mass IDOR via GraphQL `node(id:)`/batch endpoints
- [ ]  IDOR on financial objects (invoices, payouts, bank accounts)
- [ ]  IDOR + PII export via predictable storage path
- [ ]  Response-manipulation MFA bypass → zero-interaction ATO
- [ ]  JWT alg confusion (RS256→HS256) → forge any identity
- [ ]  JWT `kid` header injection (path traversal/SQLi) → mass signature forgery

**Chains**

- [ ]  OAuth redirect_uri/Referer leak + IDOR on account-linking → pre-auth mass ATO
- [ ]  OAuth state replay + callback IDOR → full ATO
- [ ]  IDOR on OAuth consent management (view/revoke others’ connected apps)
- [ ]  JWT forgery + secondary IDOR check bypass → auth bypass + BOLA combined
- [ ]  Refresh token IDOR → mint access tokens for other accounts
- [ ]  Nested-object BOLA (`/orders/{id}/items/{item_id}` checks order, not item)
- [ ]  API versioning IDOR (v1 live/unprotected, v2 fixed)
- [ ]  Mass assignment + IDOR (extra `owner_id`/`user_id` field reassigns ownership)
- [ ]  HTTP verb tampering + IDOR (GET checked, PUT/PATCH/DELETE not)
- [ ]  TOCTOU on ownership transfer (race a claim/transfer endpoint)
- [ ]  Race condition + IDOR on invite/redeem flows (double redemption)
- [ ]  Race condition on rate-limited ID enumeration
- [ ]  IDOR on impersonation/support tooling → become anyone incl. admin
- [ ]  IDOR on session/device management (view/revoke others’ sessions)
- [ ]  IDOR on MFA enrollment/reset endpoints → chained ATO

**Edge-case patterns to check on every target**

- [ ]  Multi-step workflow: call finalize/approve directly, skip earlier steps
- [ ]  Bulk endpoint: ownership checked once vs. per-item in the loop
- [ ]  Nested resource permission inheritance gaps
- [ ]  Impersonation/support-login sessions not scoping down
- [ ]  Second-order authz (low-trust input reappearing unverified in high-trust context)
- [ ]  Type-coercion bypass (negative IDs, arrays vs scalars, null vs missing, string-vs-int)

**Business logic + race (your catalog’s #3 priority)**

- [ ]  Price/quantity manipulation, negative values, coupon stacking
- [ ]  Single-packet/multi-threaded TOCTOU on check-then-act (coupon, balance transfer, password reset)
