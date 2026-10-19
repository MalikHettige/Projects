# Security Labs

Small, local-only practice applications for learning web security through controlled vulnerable and secure implementations.

> These labs intentionally contain vulnerabilities. Run them only on your own machine, bind them to loopback, and never reuse real credentials or data.

| Lab | Learning focus | Start here |
|---|---|---|
| [Authentication](authentication-lab/README.md) | Session rotation and server-side logout | `cd authentication-lab` |
| [Information Disclosure](information-disclosure-lab/README.md) | Unintended response, file, and error leakage | `cd information-disclosure-lab` |
| [JWT](jwt-lab/README.md) | Signature, algorithm, and claim validation | `cd jwt-lab` |
| [CORS](cors-lab/README.md) | Browser-enforced cross-origin response access | `cd cors-lab` |
| [AuthZ](authz-lab/README.md) | Multi-tenant authorization decisions | `cd authz-lab` |
| [SSRF](ssrf-lab/README.md) | Server-side URL handling and internal-service boundaries | `cd ssrf-lab` |
| [HTTP Request Smuggling](request-smuggling-lab/README.md) | Front-end/back-end HTTP framing disagreement | `cd request-smuggling-lab` |
| [Insecure Deserialization](deserialization-lab/README.md) | Trust boundaries around serialized JSON data | `cd deserialization-lab` |
| [Web Cache Poisoning](cache-poisoning-lab/README.md) | Cache-key and response-input mismatches | `cd cache-poisoning-lab` |

The four original standalone labs (Authentication, Information Disclosure, JWT, and CORS) and the four advanced labs use only Node.js built-ins. Their defaults demonstrate the flaw; set `LAB_MODE=secure` to exercise the fix. Tests run both modes. Each README documents startup, reset, the scenario, and its safe correction. The advanced labs are local-only synthetic simulations: they never make arbitrary network requests, forward smuggled traffic, execute deserialized content, or use an external cache. Their exercises build recognition and remediation skills; no finding or bounty outcome is guaranteed.
