# SSRF Lab

Practice spotting a server-side URL fetch that crosses a trust boundary. The entire destination space is a fixed in-process mock: `public.mock` and `internal.mock` map to synthetic responses; every other hostname is blocked. The application does not use a network client for destinations and never contacts a real internal service.

> Intentionally vulnerable, local-only exercise. Bind only to loopback, use synthetic inputs, and do not treat a simulated result as a real vulnerability or bounty finding.

## Cold start, reset, and retry

Requires Node.js 20 or newer; no installation is needed. Start with a clean process and no persisted state:

```bash
npm start
npm test
```

The server binds to `127.0.0.1:4320` and defaults to vulnerable mode. Use `$env:LAB_MODE = 'secure'; npm start` in PowerShell to switch modes, then `Remove-Item Env:LAB_MODE` to clear the setting. Stop and restart to reset. Tests start fresh ephemeral loopback servers; rerun `npm test` for a clean retry.

## Cold-start challenge

Without reading the hints first, submit `POST /fetch` with `{"target":"http://internal.mock/admin"}`. Then determine what policy should separate a public catalog request from internal destinations, and try the same request in secure mode.

Graduated hints:
1. Trace how `target` gets interpreted; focus on the trust decision, not just URL syntax.
2. Compare the permitted public hostname with `internal.mock`. Ask what a real server-side fetch could reach that a caller could not.
3. The vulnerable implementation dispatches both hosts to the synthetic destination model. The secure mode allows only `public.mock`.

## Safe simulated chain and fix

In this bounded model, an attacker-controlled URL reaches a mock internal-only training record. This demonstrates the shape of an SSRF-to-sensitive-service chain without contacting a network, cloud metadata endpoint, or real system. The secure fix is to avoid user-selected destinations where possible; otherwise use strict destination allowlists, validate the resolved destination at connection time, restrict redirects, and enforce network egress controls. This lab's allowlist is a teaching model, not production-grade DNS or redirect handling.
