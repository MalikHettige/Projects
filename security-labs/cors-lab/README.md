# CORS Lab

See how a credentialed cross-origin response is exposed or blocked by a browser. The lab runs a local API and identical exercise pages on two distinct origins; its cookie and response body are synthetic.

> Intentionally vulnerable, local-only exercise. Never expose it, use real data, or treat a command-line HTTP client as a browser CORS test.

## Run and reset

Requires Node.js 20 or newer; no package installation is needed.

```bash
npm start
npm test
```

The servers bind to `127.0.0.1:4300-4302` and default to vulnerable mode. For secure mode, use `$env:LAB_MODE = 'secure'; npm start` in PowerShell or `LAB_MODE=secure npm start` in Bash. Clear the variable with `Remove-Item Env:LAB_MODE` in PowerShell (or open a fresh shell) to return to vulnerable mode. Stop and restart all three local servers to reset. The page origins are `http://127.0.0.1:4300` (allowed in secure mode) and `http://127.0.0.1:4302` (untrusted); the API is `http://127.0.0.1:4301`.

## Browser exercise

1. Open `http://127.0.0.1:4301/seed` directly in a browser once to set the synthetic HttpOnly cookie.
2. Visit `http://127.0.0.1:4302/` and click **Fetch synthetic secret**. In vulnerable mode the page can read it.
3. Restart in secure mode and repeat: the API no longer grants CORS read access to origin `:4302`. The allowed exercise page at `http://127.0.0.1:4300/` can still read the response.

CORS governs whether browser JavaScript can read a cross-origin response; it is not server-side authorization, and a `curl` request does not enforce browser CORS rules. The test checks emitted policy headers, while this browser exercise demonstrates actual browser enforcement.

**Learning objectives:** identify unsafe origin reflection with credentials, use an exact origin allowlist, and distinguish CORS from authentication/authorization. **Hint:** `Access-Control-Allow-Origin: *` cannot be combined with credentialed reads; reflecting arbitrary origins is also unsafe. **Fix:** return CORS permission only for the explicitly trusted origin.
