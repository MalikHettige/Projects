# Information Disclosure Lab

Find unintended disclosure through over-broad API serialization, an exposed synthetic backup, and detailed error responses. Every datum is fabricated; the “key” is explicitly not a credential.

> Intentionally vulnerable, local-only exercise. Never expose it or substitute real configuration or data.

## Run and reset

Requires Node.js 20 or newer; no package installation is needed.

```bash
npm start
npm test
```

The server binds to `127.0.0.1:4311` and defaults to vulnerable mode. For secure mode, use `$env:LAB_MODE = 'secure'; npm start` in PowerShell or `LAB_MODE=secure npm start` in Bash. Clear the variable with `Remove-Item Env:LAB_MODE` in PowerShell (or open a fresh shell) to return to vulnerable mode. Stop and restart the process to reset the lab. It stores no state.

## Scenario

**Learning objectives:** distinguish the public response contract from internal data, check whether sensitive static files are routable, and avoid returning implementation details in errors.

Inspect `GET /api/profile`, `GET /downloads/backup.json`, and `GET /api/profile?fail=1` in vulnerable mode. The only public profile field should be `username`; the backup is synthetic and should not be served; an error should not disclose a stack trace.

**Hint:** filtering fields in a UI does not filter an API response. **Fix:** construct explicit response objects, keep backups outside the served surface, and return generic client errors while keeping diagnostics server-side. `tests/disclosure.test.mjs` checks both modes.
