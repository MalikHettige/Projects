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

before(async () => {
  globalThis.vulnerableUrl = await start("vulnerable");
  globalThis.secureUrl = await start("secure");
});

after(async () => {
  await Promise.all(servers.map((server) => new Promise((resolve) => server.close(resolve))));
});

async function importRecord(base, record) {
  return fetch(`${base}/import`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(record),
  });
}

describe("constrained serialized JSON records", () => {
  it("lets a vulnerable importer treat serialized fields as an operation", async () => {
    const response = await importRecord(vulnerableUrl, {
      type: "set-role",
      target: "alice",
      role: "admin",
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).profile.role, "admin");
  });

  it("rejects operation-like fields and unknown properties in secure mode", async () => {
    const response = await importRecord(secureUrl, {
      type: "set-role",
      target: "alice",
      role: "admin",
    });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, "serialized record rejected by schema");
  });

  it("accepts a bounded profile record but keeps its role server-controlled", async () => {
    const response = await importRecord(secureUrl, { type: "profile", displayName: "Practice User" });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).profile, { displayName: "Practice User", role: "user" });
  });
});
