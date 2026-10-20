# Authentication Lab

Practice two connected session-lifecycle mistakes: retaining a caller-known session ID after login (session fixation) and clearing only the browser cookie on logout while leaving the server session valid. The app uses a single synthetic account and an in-memory session map; restarting it resets all state.

> Intentionally vulnerable, local-only exercise. Never expose it or use real credentials.

## Run and reset

Requires Node.js 20 or newer; no package installation is needed.

```bash
npm start
npm test
```

The server binds to `127.0.0.1:4310` and defaults to vulnerable mode. For secure mode, use `$env:LAB_MODE = 'secure'; npm start` in PowerShell or `LAB_MODE=secure npm start` in Bash. Clear the variable with `Remove-Item Env:LAB_MODE` in PowerShell (or open a fresh shell) to return to vulnerable mode. Use `alice` / `lab-password` only in this lab. Stop and restart the process to reset sessions.

## Scenario

**Learning objectives:** explain why an authenticated session ID must not be chosen by an unauthenticated client; explain why logout must revoke server-side state.

1. Send `POST /login` with the JSON body `{"username":"alice","password":"lab-password"}` and a caller-chosen `Cookie: sid=attacker-known-id`.
2. Observe whether login returns that ID or a newly generated one. Then `POST /logout` with the session cookie and replay it to `GET /me`.
3. Switch to secure mode and repeat. A secure login rotates the identifier, and logout removes the server-side session.

**Hint:** a `Set-Cookie` deletion affects the browser, not other copies of the same cookie. **Fix:** generate a fresh unpredictable session ID on authentication and invalidate the server-side record at logout. `tests/session.test.mjs` demonstrates both vulnerable and fixed behavior.
