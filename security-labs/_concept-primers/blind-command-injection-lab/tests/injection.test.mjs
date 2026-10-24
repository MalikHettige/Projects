import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, rmSync } from "node:fs";
import { after, before, test } from "node:test";
import { createApp } from "../server.mjs";

let server;
let baseUrl;

before(async () => {
  server = createApp().listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

async function submitFeedback(email) {
  return fetch(baseUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ name: "Learner", email, message: "Hello" }),
  });
}

test("serves the feedback form from the single endpoint", async () => {
  const response = await fetch(baseUrl);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /name="name"/);
  assert.match(html, /name="email"/);
  assert.match(html, /name="message"/);
});

test("a normal submission is acknowledged immediately", async () => {
  const response = await submitFeedback("person@example.com");
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "Thank you for your feedback.");
});

test("the endpoint is blind: response body never carries job output, benign or malicious input alike", async () => {
  const weird = 'weird"$(echo should-not-appear)`echo neither`';
  const response = await submitFeedback(weird);
  const body = await response.text();
  assert.equal(response.status, 200);
  assert.equal(body, "Thank you for your feedback.");
  assert.doesNotMatch(body, /should-not-appear|neither/);
});

// Proves the injection point is real (genuine shell execution, not a
// simulation) using a harmless file-marker side effect. This intentionally
// does NOT exercise an out-of-band / DNS-exfiltration technique — working
// that out, and the breakout syntax that gets you there, is the point of the
// exercise this lab supports.
test("unsanitized interpolation reaches a real shell (vulnerability smoke test)", async () => {
  const marker = `/tmp/cmdi-proof-${randomUUID()}`;
  rmSync(marker, { force: true });
  try {
    await submitFeedback(`x; touch ${marker} #`);
    await new Promise((resolve) => setTimeout(resolve, 200));
    assert.ok(existsSync(marker), "expected the injected command to have run");
  } finally {
    rmSync(marker, { force: true });
  }
});
