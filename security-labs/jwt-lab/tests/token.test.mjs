import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createServer, issueUserToken } from "../server.mjs";

const servers = [];

async function start(mode) {
  const server = createServer(mode);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  servers.push(server);
  return `http://127.0.0.1:${server.address().port}`;
}

function unsignedToken(claims) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode(claims)}.`;
}

before(async () => {
  globalThis.vulnerableUrl = await start("vulnerable");
  globalThis.secureUrl = await start("secure");
});

after(async () => {
  await Promise.all(servers.map((server) => new Promise((resolve) => server.close(resolve))));
});

describe("JWT validation and claim trust", () => {
  it("accepts an unsigned locally fabricated admin claim in vulnerable mode", async () => {
    const token = unsignedToken({ sub: "synthetic-attacker", role: "admin" });
    const response = await fetch(`${vulnerableUrl}/admin`, { headers: { authorization: `Bearer ${token}` } });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).subject, "synthetic-attacker");
  });

  it("rejects the unsigned claim and limits a valid user token in secure mode", async () => {
    const forgedToken = unsignedToken({ sub: "synthetic-attacker", role: "admin" });
    const forged = await fetch(`${secureUrl}/admin`, { headers: { authorization: `Bearer ${forgedToken}` } });
    assert.equal(forged.status, 401);

    const validUserToken = issueUserToken();
    const user = await fetch(`${secureUrl}/admin`, { headers: { authorization: `Bearer ${validUserToken}` } });
    assert.equal(user.status, 403);
  });
});
