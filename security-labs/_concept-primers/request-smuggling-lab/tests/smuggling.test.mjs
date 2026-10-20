import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createServer } from "../server.mjs";

const servers = [];

async function start(mode) {
  const server = createServer(mode);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  servers.push(server);
  return `http://127.0.0.1:${server.address().port}`;
}

const frame = {
  contentLength: 4,
  contentBody: "PING",
  transferEncoding: "chunked",
  chunkedBody: "PONG",
  trailingRequest: "GET /synthetic-admin",
};

before(async () => {
  globalThis.vulnerableUrl = await start("vulnerable");
  globalThis.secureUrl = await start("secure");
});

after(async () => {
  await Promise.all(servers.map((server) => new Promise((resolve) => server.close(resolve))));
});

async function simulate(base) {
  return fetch(`${base}/simulate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(frame),
  });
}

describe("synthetic request parser disagreement", () => {
  it("models a queued synthetic route when interpretations differ", async () => {
    const response = await simulate(vulnerableUrl);
    const result = await response.json();
    assert.equal(response.status, 200);
    assert.equal(result.frontEndBody, "PING");
    assert.equal(result.backendBody, "PONG");
    assert.equal(result.queuedRoute, "/synthetic-admin");
    assert.match(result.simulatedImpact, /synthetic admin response/);
  });

  it("rejects conflicting framing in secure mode", async () => {
    const response = await simulate(secureUrl);
    const result = await response.json();
    assert.equal(response.status, 400);
    assert.match(result.error, /conflicting/);
  });

  it("processes an unambiguous request in either mode", async () => {
    const unambiguous = { contentLength: 4, contentBody: "PING", chunkedBody: "", trailingRequest: "" };
    const response = await fetch(`${secureUrl}/simulate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(unambiguous),
    });
    const result = await response.json();
    assert.equal(result.frontEndBody, "PING");
    assert.equal(result.queuedRoute, null);
  });
});
