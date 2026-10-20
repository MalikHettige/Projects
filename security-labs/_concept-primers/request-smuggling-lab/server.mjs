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

export function simulateParsers(input, mode = "vulnerable") {
  if (mode !== "vulnerable" && mode !== "secure") throw new Error(`Unknown lab mode: ${mode}`);
  if (
    !Number.isInteger(input.contentLength)
    || input.contentLength < 0
    || typeof input.contentBody !== "string"
    || typeof input.chunkedBody !== "string"
    || typeof input.trailingRequest !== "string"
  ) return { status: 400, body: { error: "invalid synthetic framing model" } };

  const hasConflictingFraming = input.transferEncoding === "chunked";
  if (mode === "secure" && hasConflictingFraming) {
    return { status: 400, body: { error: "conflicting Content-Length and Transfer-Encoding rejected" } };
  }

  const frontEndBody = input.contentBody.slice(0, input.contentLength);
  if (!hasConflictingFraming) {
    return { status: 200, body: { frontEndBody, backendBody: frontEndBody, queuedRoute: null } };
  }

  // This is a data-only parser model; it does not parse or forward real HTTP traffic.
  const backendBody = input.chunkedBody;
  const queuedRoute = input.trailingRequest.trim() === "GET /synthetic-admin"
    ? "/synthetic-admin"
    : null;
  return {
    status: 200,
    body: {
      frontEndBody,
      backendBody,
      queuedRoute,
      simulatedImpact: queuedRoute ? "synthetic admin response would be associated with the next request" : null,
    },
  };
}

export function createServer(mode = "vulnerable") {
  if (mode !== "vulnerable" && mode !== "secure") throw new Error(`Unknown lab mode: ${mode}`);
  return httpCreateServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (request.method === "POST" && url.pathname === "/simulate") {
      try {
        const result = simulateParsers(await readJson(request), mode);
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
  server.listen(4321, "127.0.0.1", () => {
    console.log(`Request smuggling lab (${mode}) listening at http://127.0.0.1:4321`);
  });
}
