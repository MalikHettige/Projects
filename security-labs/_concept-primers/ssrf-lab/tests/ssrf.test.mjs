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

async function fetchTarget(base, target) {
  return fetch(`${base}/fetch`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ target }),
  });
}

before(async () => {
  globalThis.vulnerableUrl = await start("vulnerable");
  globalThis.secureUrl = await start("secure");
});

after(async () => {
  await Promise.all(servers.map((server) => new Promise((resolve) => server.close(resolve))));
});

describe("SSRF destination policy in a fixed mock network", () => {
  it("lets a vulnerable caller reach the synthetic internal service", async () => {
    const response = await fetchTarget(vulnerableUrl, "http://internal.mock/admin");
    assert.equal(response.status, 200);
    assert.equal((await response.json()).token, "mock-token-not-valid-anywhere");
  });

  it("allows the public mock route but blocks internal routes in secure mode", async () => {
    const allowed = await fetchTarget(secureUrl, "http://public.mock/catalog");
    assert.equal(allowed.status, 200);
    assert.deepEqual((await allowed.json()).items, ["synthetic item A", "synthetic item B"]);
    const blocked = await fetchTarget(secureUrl, "http://internal.mock/admin");
    assert.equal(blocked.status, 403);
  });

  it("never makes a network request for an unknown hostname", async () => {
    const response = await fetchTarget(vulnerableUrl, "http://example.invalid/");
    assert.equal(response.status, 502);
    assert.equal((await response.json()).error, "mock network blocked this host");
  });
});
