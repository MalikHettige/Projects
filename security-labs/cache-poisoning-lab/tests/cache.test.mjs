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

async function reset(base) {
  await fetch(`${base}/reset`, { method: "POST" });
}

describe("synthetic web cache keys and response inputs", () => {
  it("caches attacker-controlled forwarded-host content under a shared path key", async () => {
    await reset(vulnerableUrl);
    const poison = await fetch(`${vulnerableUrl}/page`, { headers: { "x-forwarded-host": "attacker.mock" } });
    assert.equal(poison.headers.get("x-lab-cache"), "MISS");
    const victim = await fetch(`${vulnerableUrl}/page`);
    assert.equal(victim.headers.get("x-lab-cache"), "HIT");
    assert.equal((await victim.json()).canonicalLink, "https://attacker.mock/page");
  });

  it("uses a fixed origin and request-host-specific key in secure mode", async () => {
    await reset(secureUrl);
    await fetch(`${secureUrl}/page`, { headers: { host: "shop-a.mock", "x-forwarded-host": "attacker.mock" } });
    const victim = await fetch(`${secureUrl}/page`, { headers: { host: "shop-b.mock" } });
    assert.equal((await victim.json()).canonicalLink, "https://shop.mock/page");
  });

  it("clears only the process-local synthetic cache on reset", async () => {
    await reset(vulnerableUrl);
    await fetch(`${vulnerableUrl}/page`, { headers: { "x-forwarded-host": "attacker.mock" } });
    await reset(vulnerableUrl);
    const response = await fetch(`${vulnerableUrl}/page`);
    assert.equal((await response.json()).canonicalLink, "https://shop.mock/page");
  });
});
