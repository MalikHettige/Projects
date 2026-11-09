# Blind OS Command Injection Lab

A local feedback-form app with a genuine, unsanitized OS command injection
vulnerability — built to practice PortSwigger's "Blind OS command injection
with out-of-band interaction" and "...with out-of-band data exfiltration"
lab objectives in an environment where Burp Collaborator isn't available.

**This is a real vulnerability, not a simulation.** The `email` field from
`POST /` is interpolated — unquoted, unescaped — into a shell command string
and handed to `child_process.exec()`, which spawns a real `/bin/sh -c`.
Whatever shell metacharacters you get into that string, the shell will
parse and execute.

## Why it's blind

The HTTP response is sent immediately (`200 OK`, fixed text) before the
shell command even starts running (`setImmediate` defers the `exec()` call).
Nothing the injected command produces — stdout, stderr, exit code — ever
reaches the HTTP response. The only way to know your command ran is to make
it do something observable out-of-band: a DNS lookup, an HTTP callback, a
file write, etc.

## Run

Requires Node.js 20+.

```bash
npm install
npm start
```

Open <http://127.0.0.1:4321>. **Keep this bound to loopback — do not expose
it to any network or untrusted user.** It will execute whatever shell
command you can construct through the `email` field.

Submit feedback normally through the form, or use a local HTTP request
editor (Burp, mitmproxy, curl) to control the `email` field directly —
that's the injection point.

## Suggested practice flow

1. **Out-of-band interaction** — get the server to make a DNS lookup
   against a listener you control (e.g. `interactsh-client` running in the
   same VM) and confirm the interaction shows up.
2. **Out-of-band data exfiltration** — once interaction alone works, get
   the *output* of a command (e.g. `whoami`, `id`, a file's contents) to
   show up readably in your listener's logs. DNS can only carry data
   encoded into subdomain labels, not raw stdout — that constraint is the
   actual exercise.

No payload is included in this README on purpose. Working out the breakout
syntax and the output-encoding technique yourself is the point.

## Tests

```bash
npm test
```

The suite checks the form renders, that normal submissions are acknowledged
immediately, that the HTTP response never leaks job output under any input,
and includes one smoke test proving the injection point reaches a real
shell (via a harmless file-marker side effect — not the OOB/DNS technique
itself).
