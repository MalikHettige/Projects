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

function cookieFrom(response) {
  return response.headers.get("set-cookie").split(";")[0];
}

before(async () => {
  globalThis.vulnerableUrl = await start("vulnerable");
  globalThis.secureUrl = await start("secure");
});

after(async () => {
  await Promise.all(servers.map((server) => new Promise((resolve) => server.close(resolve))));
});

describe("session lifecycle", () => {
  it("reproduces session fixation and post-logout session reuse", async () => {
    const fixedCookie = "sid=attacker-known-id";
    const login = await fetch(`${vulnerableUrl}/login`, {
      method: "POST",
      headers: { cookie: fixedCookie, "content-type": "application/json" },
      body: JSON.stringify({ username: "alice", password: "lab-password" }),
    });
    assert.equal(cookieFrom(login), fixedCookie);
    await fetch(`${vulnerableUrl}/logout`, { method: "POST", headers: { cookie: fixedCookie } });
    const replay = await fetch(`${vulnerableUrl}/me`, { headers: { cookie: fixedCookie } });
    assert.equal(replay.status, 200);
  });

  it("rotates the session identifier and invalidates it on logout", async () => {
    const fixedCookie = "sid=attacker-known-id";
    const login = await fetch(`${secureUrl}/login`, {
      method: "POST",
      headers: { cookie: fixedCookie, "content-type": "application/json" },
      body: JSON.stringify({ username: "alice", password: "lab-password" }),
    });
    const sessionCookie = cookieFrom(login);
    assert.notEqual(sessionCookie, fixedCookie);
    assert.equal((await fetch(`${secureUrl}/me`, { headers: { cookie: sessionCookie } })).status, 200);
    await fetch(`${secureUrl}/logout`, { method: "POST", headers: { cookie: sessionCookie } });
    assert.equal((await fetch(`${secureUrl}/me`, { headers: { cookie: sessionCookie } })).status, 401);
  });
});
