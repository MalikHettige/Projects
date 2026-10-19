import { createServer as httpCreateServer } from "node:http";
import { pathToFileURL } from "node:url";

const CANONICAL_ORIGIN = "https://shop.mock";

function send(response, status, body, extraHeaders = {}) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", ...extraHeaders });
  response.end(JSON.stringify(body));
}

export function createServer(mode = "vulnerable") {
  if (mode !== "vulnerable" && mode !== "secure") throw new Error(`Unknown lab mode: ${mode}`);
  const cache = new Map();
  return httpCreateServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (request.method === "POST" && url.pathname === "/reset") {
      cache.clear();
      return send(response, 200, { message: "synthetic in-memory cache cleared" });
    }
    if (request.method !== "GET" || url.pathname !== "/page") {
      return send(response, 404, { error: "not found" });
    }

    const host = request.headers.host ?? "localhost";
    const forwardedHost = request.headers["x-forwarded-host"];
    const cacheKey = mode === "vulnerable" ? url.pathname : `${host}${url.pathname}`;
    let entry = cache.get(cacheKey);
    const cacheStatus = entry ? "HIT" : "MISS";
    if (!entry) {
      const origin = mode === "vulnerable" && typeof forwardedHost === "string"
        ? `https://${forwardedHost}`
        : CANONICAL_ORIGIN;
      entry = {
        body: { title: "Synthetic shop page", canonicalLink: `${origin}/page` },
      };
      cache.set(cacheKey, entry);
    }
    return send(response, 200, entry.body, { "x-lab-cache": cacheStatus });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.env.LAB_MODE ?? "vulnerable";
  const server = createServer(mode);
  server.listen(4323, "127.0.0.1", () => {
    console.log(`Cache poisoning lab (${mode}) listening at http://127.0.0.1:4323`);
  });
}
