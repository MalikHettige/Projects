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

describe("information disclosure", () => {
  it("exposes synthetic profile fields, a backup, and stack details in vulnerable mode", async () => {
    const profile = await (await fetch(`${vulnerableUrl}/api/profile`)).json();
    assert.equal(profile.email, "alice@example.test");
    assert.equal(profile.internalNote, "Synthetic note: account review pending");
    const backup = await (await fetch(`${vulnerableUrl}/downloads/backup.json`)).json();
    assert.equal(backup.apiKey, "SYNTHETIC-NOT-A-CREDENTIAL");
    const failure = await (await fetch(`${vulnerableUrl}/api/profile?fail=1`)).json();
    assert.match(failure.stack, /synthetic failure/);
  });

  it("returns only the intended profile field and hides backup and internal errors", async () => {
    const profile = await (await fetch(`${secureUrl}/api/profile`)).json();
    assert.deepEqual(profile, { username: "alice" });
    assert.equal((await fetch(`${secureUrl}/downloads/backup.json`)).status, 404);
    const failureResponse = await fetch(`${secureUrl}/api/profile?fail=1`);
    const failure = await failureResponse.json();
    assert.equal(failureResponse.status, 500);
    assert.deepEqual(failure, { error: "request failed" });
  });
});
