# JWT Lab

Practice validating a locally generated JWT signature and trusting claims only after validating them. The lab creates an ephemeral RSA key pair on process startup; no real token, key, account, external service, or target is involved.

> Intentionally vulnerable, local-only exercise. The vulnerable mode accepts unverified claims. Never expose the service or copy its vulnerable verifier.

## Run and reset

Requires Node.js 20 or newer; no package installation is needed.

```bash
npm start
npm test
```

The server binds to `127.0.0.1:4312` and defaults to vulnerable mode. For secure mode, use `$env:LAB_MODE = 'secure'; npm start` in PowerShell or `LAB_MODE=secure npm start` in Bash. Clear the variable with `Remove-Item Env:LAB_MODE` in PowerShell (or open a fresh shell) to return to vulnerable mode. `GET /token` returns a short-lived, signed synthetic user token. `GET /admin` requires a token with an admin role. Stop and restart to generate a new local RSA key pair.

## Scenario

**Learning objectives:** distinguish decoding from verification, pin the expected signing algorithm and key, and validate issuer, audience, expiry, subject, and role claims before making authorization decisions.

Submit a locally constructed unsigned JWT with `{"alg":"none"}` and a synthetic `{"sub":"synthetic-attacker","role":"admin"}` payload as `Authorization: Bearer …` to `/admin`. Vulnerable mode trusts the payload; secure mode rejects it. The test builds this token locally and never uses an external token.

**Hint:** base64url decoding is not proof of authenticity. **Fix:** verify the signature with the configured public key and fixed algorithm, then enforce required claim semantics and authorization. `tests/token.test.mjs` checks the forged and valid-token cases.
