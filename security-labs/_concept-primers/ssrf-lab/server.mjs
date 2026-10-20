import { createServer as httpCreateServer } from "node:http";
import { pathToFileURL } from "node:url";

const MAX_BODY = 4096;
const INTERNAL_HOST = "internal.mock";

function send(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > MAX_BODY) throw new Error("request body too large");
  }
  return JSON.parse(body);
}

function mockInternalService(url) {
  if (url.hostname !== INTERNAL_HOST) return { status: 502, body: { error: "mock network blocked this host" } };
  if (url.pathname === "/health") return { status: 200, body: { service: "synthetic-inventory", status: "ok" } };
  if (url.pathname === "/admin") return { status: 200, body: { note: "synthetic internal-only training record", token: "mock-token-not-valid-anywhere" } };
  return { status: 404, body: { error: "mock route not found" } };
}

export function simulateFetch(target, mode = "vulnerable") {
  if (mode !== "vulnerable" && mode !== "secure") throw new Error(`Unknown lab mode: ${mode}`);
  let url;
  try {
    url = new URL(target);
  } catch {
    return { status: 400, body: { error: "invalid URL" } };
  }

  if (url.protocol !== "http:" || url.username || url.password) {
    return { status: 400, body: { error: "only credential-free mock HTTP URLs are accepted" } };
  }
  if (mode === "secure" && url.hostname !== "public.mock") {
    return { status: 403, body: { error: "destination is not on the public mock allowlist" } };
  }

  // Every destination is resolved in this fixed local model; no network client is used.
  if (url.hostname === "public.mock" && url.pathname === "/catalog") {
    return { status: 200, body: { items: ["synthetic item A", "synthetic item B"] } };
  }
  return mockInternalService(url);
}

export function createServer(mode = "vulnerable") {
  if (mode !== "vulnerable" && mode !== "secure") throw new Error(`Unknown lab mode: ${mode}`);
  return httpCreateServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (request.method === "POST" && url.pathname === "/fetch") {
      try {
        const input = await readJson(request);
        if (typeof input.target !== "string") return send(response, 400, { error: "target must be a URL string" });
        const result = simulateFetch(input.target, mode);
        return send(response, result.status, result.body);
      } catch (error) {
        return send(response, 400, { error: error.message });
      }
    }
    return send(response, 404, { error: "not found" });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.env.LAB_MODE ?? "vulnerable";
  const server = createServer(mode);
  server.listen(4320, "127.0.0.1", () => {
    console.log(`SSRF lab (${mode}) listening at http://127.0.0.1:4320`);
  });
}
