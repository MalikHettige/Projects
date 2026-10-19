# HTTP Request Smuggling Lab

Explore how two HTTP parsers can disagree about message boundaries. This is a data-only, structured parser model: it accepts JSON describing hypothetical framing and returns a synthetic interpretation. It does not parse a raw HTTP stream, open a backend connection, or forward any request.

> Intentionally vulnerable, local-only exercise. All routes and effects are synthetic. Never use this model to test real systems without explicit authorization.

## Cold start, reset, and retry

Requires Node.js 20 or newer; no installation is needed.

```bash
npm start
npm test
```

The server binds to `127.0.0.1:4321`, defaulting to vulnerable mode. Use `$env:LAB_MODE = 'secure'; npm start` in PowerShell for secure mode; clear it with `Remove-Item Env:LAB_MODE`. Restart for a fresh run. The simulation has no persistent state; rerun `npm test` for a clean retry.

## Cold-start challenge

Inspect the JSON input to `POST /simulate` and compare `contentLength`/`contentBody` with `transferEncoding`/`chunkedBody`. These fields are deliberately separate parser views; `trailingRequest` represents only a synthetic leftover route. Predict both interpretations before looking at the result. What could the leftover route mean if a real pair of parsers disagreed?

Graduated hints:
1. A single request must have one unambiguous message boundary at every hop.
2. The vulnerable model trusts both framing descriptions simultaneously.
3. With both framing indicators present, the front end consumes the declared-length body while the modeled back end uses the chunked body and may queue the synthetic trailing route.

## Safe simulated chain and fix

The crafted model can produce a synthetic `/synthetic-admin` queued-route result, illustrating a desynchronization-to-response-association chain without any raw smuggled traffic or real privilege boundary. Secure mode rejects conflicting framing. In real deployments, consistently reject ambiguous `Content-Length`/`Transfer-Encoding` combinations, normalize framing at a trusted edge, and keep proxy and origin parser behavior aligned. Do not rely on this intentionally simplified model as a production parser.
