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

The four standalone labs use only Node.js built-ins. Their defaults demonstrate the flaw; set `LAB_MODE=secure` to exercise the fix. Tests run both modes. Each README documents startup, reset, the scenario, and its safe correction.
