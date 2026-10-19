import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createApiServer } from "../server.mjs";

const servers = [];

async function start(mode) {
  const server = createApiServer(mode);
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

describe("CORS response policy", () => {
  it("reflects an untrusted origin with credentials in vulnerable mode", async () => {
    const response = await fetch(`${vulnerableUrl}/secret`, {
      headers: { origin: "http://127.0.0.1:4302", cookie: "lab_session=synthetic-session" },
    });
    assert.equal(response.headers.get("access-control-allow-origin"), "http://127.0.0.1:4302");
    assert.equal(response.headers.get("access-control-allow-credentials"), "true");
    assert.equal((await response.json()).message, "Synthetic training-only secret");
  });

  it("allows the exercise origin but emits no CORS permission for another origin", async () => {
    const allowed = await fetch(`${secureUrl}/secret`, {
      headers: { origin: "http://127.0.0.1:4300" },
    });
    assert.equal(allowed.headers.get("access-control-allow-origin"), "http://127.0.0.1:4300");
    const denied = await fetch(`${secureUrl}/secret`, {
      headers: { origin: "http://127.0.0.1:4302" },
    });
    assert.equal(denied.headers.get("access-control-allow-origin"), null);
  });
});
