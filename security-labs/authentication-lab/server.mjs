import { randomUUID } from "node:crypto";
import { createServer as httpCreateServer } from "node:http";
import { pathToFileURL } from "node:url";

const credentials = { username: "alice", password: "lab-password" };

function sessionCookie(value, maxAge) {
  return `sid=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

function readSessionId(request) {
  const cookie = request.headers.cookie ?? "";
  const match = cookie.match(/(?:^|;\s*)sid=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function send(response, status, body, headers = {}) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", ...headers });
  response.end(JSON.stringify(body));
}

export function createServer(mode = "vulnerable") {
  if (mode !== "vulnerable" && mode !== "secure") throw new Error(`Unknown lab mode: ${mode}`);
  const sessions = new Map();

  return httpCreateServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (request.method === "POST" && url.pathname === "/login") {
      let body = "";
      for await (const chunk of request) body += chunk;
      let credentialsBody;
      try {
        credentialsBody = JSON.parse(body);
      } catch {
        return send(response, 400, { error: "invalid JSON" });
      }
      if (credentialsBody.username !== credentials.username || credentialsBody.password !== credentials.password) {
        return send(response, 401, { error: "invalid credentials" });
      }

      const suppliedId = readSessionId(request);
      const sessionId = mode === "vulnerable" && suppliedId ? suppliedId : randomUUID();
      if (mode === "secure" && suppliedId) sessions.delete(suppliedId);
      sessions.set(sessionId, { username: credentials.username });
      return send(response, 200, { authenticated: true }, { "set-cookie": sessionCookie(sessionId, 3600) });
    }

    const sessionId = readSessionId(request);
    if (request.method === "GET" && url.pathname === "/me") {
      const session = sessionId ? sessions.get(sessionId) : undefined;
      return session
        ? send(response, 200, { username: session.username })
        : send(response, 401, { error: "not authenticated" });
    }

    if (request.method === "POST" && url.pathname === "/logout") {
      if (mode === "secure" && sessionId) sessions.delete(sessionId);
      return send(response, 200, { loggedOut: true }, { "set-cookie": sessionCookie("", 0) });
    }

    return send(response, 404, { error: "not found" });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.env.LAB_MODE ?? "vulnerable";
  const server = createServer(mode);
  server.listen(4310, "127.0.0.1", () => {
    console.log(`Authentication lab (${mode}) listening at http://127.0.0.1:4310`);
  });
}
