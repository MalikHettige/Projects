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

Small, single-vulnerability demos — useful for a quick "see the mechanism once" pass on a topic before or after a PortSwigger learning path. These are **not** chainable and are not counted as real lab reps. Each has its own setup instructions and test suite. Some are bounded simulations and do not make real network calls, parse real HTTP traffic, or use an external cache; check each lab's README for its behavior and dependencies.

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
| [Blind Command Injection (Simulation)](_concept-primers/blind-command-injection-lab/README.md) | Asynchronous feedback handling and simulated DNS interactions | `cd _concept-primers/blind-command-injection-lab` |
