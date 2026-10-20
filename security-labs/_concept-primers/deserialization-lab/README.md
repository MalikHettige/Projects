# Insecure Deserialization Lab

Practice recognizing when serialized, attacker-controlled data is treated as trusted instructions or authority. This lab parses JSON with the built-in `JSON.parse` and permits only a tiny in-memory profile model. It has no gadget chains, unsafe deserialization packages, executable payloads, shell-outs, or code execution.

> Intentionally vulnerable, local-only exercise. The role update is synthetic state inside this process; it grants no real access.

## Cold start, reset, and retry

Requires Node.js 20 or newer; no installation is needed.

```bash
npm start
npm test
```

The server binds to `127.0.0.1:4322` and defaults to vulnerable mode. In PowerShell set `$env:LAB_MODE = 'secure'` before `npm start` to exercise the fix; use `Remove-Item Env:LAB_MODE` to clear. Restart the process to reset the in-memory profile. Tests use fresh servers and repeat from a clean baseline.

## Cold-start challenge

Submit a normal JSON profile to `POST /import`, then inspect which fields the server should own. Try to change Alice's role using only serialized input. Predict the result in both modes.

Graduated hints:
1. Serialization does not make data trustworthy. Look for an input field that changes an authority decision.
2. Compare the accepted record shapes; is a client allowed to choose an operation and target?
3. Vulnerable mode handles `type: "set-role"` as an in-memory operation. Secure mode accepts only the bounded profile schema and fixes the role to `user`.

## Safe simulated chain and fix

An attacker-supplied serialized record can alter the role of one synthetic profile, modeling unsafe data-to-operation flow without executable payloads. Secure mode uses an allowlisted schema, rejects unknown fields and operations, bounds user-controlled values, and keeps authority-bearing attributes server controlled. Prefer simple data formats and explicit validation; never deserialize untrusted data with executable object/gadget mechanisms.
