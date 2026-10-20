import { readFile } from "node:fs/promises";
import { createServer as httpCreateServer } from "node:http";
import { pathToFileURL } from "node:url";

const ALLOWED_ORIGIN = "http://127.0.0.1:4300";
const PAGE = await readFile(new URL("./client.html", import.meta.url));

function send(response, status, body, headers = {}) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", ...headers });
  response.end(JSON.stringify(body));
}

function corsHeaders(request, mode) {
  const origin = request.headers.origin;
  const headers = { vary: "Origin" };
  if (mode === "vulnerable" && origin) {
    headers["access-control-allow-origin"] = origin;
    headers["access-control-allow-credentials"] = "true";
  } else if (mode === "secure" && origin === ALLOWED_ORIGIN) {
    headers["access-control-allow-origin"] = ALLOWED_ORIGIN;
    headers["access-control-allow-credentials"] = "true";
  }
  return headers;
}

export function createApiServer(mode = "vulnerable") {
  if (mode !== "vulnerable" && mode !== "secure") throw new Error(`Unknown lab mode: ${mode}`);
  return httpCreateServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const headers = corsHeaders(request, mode);
    if (request.method === "OPTIONS") {
      return send(response, 204, {}, {
        ...headers,
        "access-control-allow-methods": "GET, OPTIONS",
        "access-control-allow-headers": "content-type",
      });
    }
    if (request.method === "GET" && url.pathname === "/seed") {
      response.writeHead(200, {
        "content-type": "text/plain; charset=utf-8",
        "set-cookie": "lab_session=synthetic-session; HttpOnly; SameSite=Lax; Path=/",
      });
      return response.end("Synthetic cookie initialized. This endpoint is local-only.");
    }
    if (request.method === "GET" && url.pathname === "/secret") {
      if (request.headers.cookie?.split(";").some((item) => item.trim() === "lab_session=synthetic-session")) {
        return send(response, 200, { message: "Synthetic training-only secret" }, headers);
      }
      return send(response, 401, { error: "initialize the synthetic cookie at /seed first" }, headers);
    }
    return send(response, 404, { error: "not found" }, headers);
  });
}

export function createPageServer() {
  return httpCreateServer((request, response) => {
    if (request.method !== "GET" || (request.url !== "/" && request.url !== "/client.html")) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      return response.end("not found");
    }
    response.writeHead(200, { "content-type": "text/html; charset=utf-8", "x-content-type-options": "nosniff" });
    response.end(PAGE);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.env.LAB_MODE ?? "vulnerable";
  const servers = [
    [createApiServer(mode), 4301],
    [createPageServer(), 4300],
    [createPageServer(), 4302],
  ];
  for (const [server, port] of servers) {
    server.listen(port, "127.0.0.1", () => {
      console.log(port === 4301
        ? `CORS API (${mode}) listening at http://127.0.0.1:${port}`
        : `CORS exercise page listening at http://127.0.0.1:${port}`);
    });
  }
}
