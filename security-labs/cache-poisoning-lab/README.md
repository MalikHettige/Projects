# Web Cache Poisoning Lab

Learn how unkeyed request inputs can influence a cached response that is later served to other users. This lab uses only an in-memory `Map` in one local process and harmless synthetic JSON content; it does not contact or configure an external cache.

> Intentionally vulnerable, local-only exercise. Poisoned content is synthetic and confined to this process.

## Cold start, reset, and retry

Requires Node.js 20 or newer; no installation is needed.

```bash
npm start
npm test
```

The server binds to `127.0.0.1:4323` and defaults to vulnerable mode. For secure mode, set `$env:LAB_MODE = 'secure'` in PowerShell before starting, then clear with `Remove-Item Env:LAB_MODE`. `POST /reset` clears the in-memory cache; restarting also provides a clean cold start. Tests reset between scenarios.

## Cold-start challenge

Make a request to `GET /page` with `X-Forwarded-Host: attacker.mock`, then make the same request without that header. Compare the `canonicalLink` served. Identify which request inputs affect response content and which affect the cache key.

Graduated hints:
1. A response can be poisoned if an input changes its body but is absent from the key.
2. Compare the vulnerable path-only key with the use of `X-Forwarded-Host`.
3. The first request chooses a canonical link and caches it under `/page`, where the next request reuses it.

## Safe simulated chain and fix

The synthetic chain is attacker-controlled forwarded-host input → cached canonical-link value → later visitor receives the same harmless poisoned JSON. Secure mode ignores that untrusted header, builds the link from a fixed canonical origin, and distinguishes host-specific cache entries. In production, normalize or validate forwarded headers at trusted proxies, ensure every response-varying input is represented in the cache key, and avoid caching sensitive or user-specific responses. A correct `Vary` or cache policy must match the actual intermediary behavior.
