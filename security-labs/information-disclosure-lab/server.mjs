import { createServer as httpCreateServer } from "node:http";
import { pathToFileURL } from "node:url";

const profile = {
  username: "alice",
  email: "alice@example.test",
  internalNote: "Synthetic note: account review pending",
};

const backup = {
  application: "disclosure-lab",
  environment: "local-training",
  apiKey: "SYNTHETIC-NOT-A-CREDENTIAL",
};

function send(response, status, body, contentType = "application/json; charset=utf-8") {
  response.writeHead(status, { "content-type": contentType, "x-content-type-options": "nosniff" });
  response.end(typeof body === "string" ? body : JSON.stringify(body));
}

export function createServer(mode = "vulnerable") {
  if (mode !== "vulnerable" && mode !== "secure") throw new Error(`Unknown lab mode: ${mode}`);
  return httpCreateServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");

    if (request.method === "GET" && url.pathname === "/api/profile") {
      if (url.searchParams.has("fail")) {
        return send(
          response,
          500,
          mode === "vulnerable"
            ? { error: "profile lookup failed", stack: "Error: synthetic failure\n    at loadProfile (server.mjs:42:9)" }
            : { error: "request failed" },
        );
      }
      return send(response, 200, mode === "vulnerable"
        ? profile
        : { username: profile.username });
    }

    if (request.method === "GET" && url.pathname === "/downloads/backup.json") {
      return mode === "vulnerable"
        ? send(response, 200, backup)
        : send(response, 404, { error: "not found" });
    }

    return send(response, 404, { error: "not found" });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.env.LAB_MODE ?? "vulnerable";
  const server = createServer(mode);
  server.listen(4311, "127.0.0.1", () => {
    console.log(`Information Disclosure lab (${mode}) listening at http://127.0.0.1:4311`);
  });
}
