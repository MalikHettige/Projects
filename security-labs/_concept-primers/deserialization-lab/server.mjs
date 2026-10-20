import { createServer as httpCreateServer } from "node:http";
import { pathToFileURL } from "node:url";

const MAX_BODY = 4096;
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

function applySerializedRecord(record, mode, profiles) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return { status: 400, body: { error: "serialized record must be an object" } };
  }
  if (mode === "vulnerable") {
    if (record.type === "profile" && typeof record.displayName === "string") {
      profiles.set("alice", { displayName: record.displayName, role: "user" });
      return { status: 200, body: { profile: profiles.get("alice") } };
    }
    if (record.type === "set-role" && record.target === "alice" && typeof record.role === "string") {
      profiles.set("alice", { ...profiles.get("alice"), role: record.role });
      return { status: 200, body: { profile: profiles.get("alice"), action: "synthetic role update applied" } };
    }
  } else if (
    record.type === "profile"
    && Object.keys(record).every((key) => ["type", "displayName"].includes(key))
    && typeof record.displayName === "string"
    && record.displayName.length <= 80
  ) {
    profiles.set("alice", { displayName: record.displayName, role: "user" });
    return { status: 200, body: { profile: profiles.get("alice") } };
  }
  return { status: 400, body: { error: "serialized record rejected by schema" } };
}

export function createServer(mode = "vulnerable") {
  if (mode !== "vulnerable" && mode !== "secure") throw new Error(`Unknown lab mode: ${mode}`);
  const profiles = new Map([["alice", { displayName: "Alice", role: "user" }]]);
  return httpCreateServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (request.method === "POST" && url.pathname === "/import") {
      try {
        const record = await readJson(request);
        const result = applySerializedRecord(record, mode, profiles);
        return send(response, result.status, result.body);
      } catch (error) {
        return send(response, 400, { error: error.message });
      }
    }
    if (request.method === "GET" && url.pathname === "/profile") {
      return send(response, 200, { profile: profiles.get("alice") });
    }
    return send(response, 404, { error: "not found" });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.env.LAB_MODE ?? "vulnerable";
  const server = createServer(mode);
  server.listen(4322, "127.0.0.1", () => {
    console.log(`Deserialization lab (${mode}) listening at http://127.0.0.1:4322`);
  });
}
