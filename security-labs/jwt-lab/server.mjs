import { generateKeyPairSync, sign, verify } from "node:crypto";
import { createServer as httpCreateServer } from "node:http";
import { pathToFileURL } from "node:url";

const ISSUER = "http://127.0.0.1:4312";
const AUDIENCE = "jwt-lab-api";
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function issueUserToken(now = Math.floor(Date.now() / 1000)) {
  const header = encode({ alg: "RS256", typ: "JWT" });
  const payload = encode({
    iss: ISSUER,
    aud: AUDIENCE,
    sub: "alice",
    role: "user",
    iat: now,
    exp: now + 300,
  });
  const signingInput = `${header}.${payload}`;
  const signature = sign("RSA-SHA256", Buffer.from(signingInput), privateKey).toString("base64url");
  return `${signingInput}.${signature}`;
}

function decodePayload(token) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function verifyToken(token, now = Math.floor(Date.now() / 1000)) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (header.alg !== "RS256" || typeof parts[2] !== "string") return null;
    if (!verify("RSA-SHA256", Buffer.from(`${parts[0]}.${parts[1]}`), publicKey, Buffer.from(parts[2], "base64url"))) {
      return null;
    }
    if (
      claims.iss !== ISSUER
      || claims.aud !== AUDIENCE
      || typeof claims.sub !== "string"
      || !["user", "admin"].includes(claims.role)
      || !Number.isInteger(claims.exp)
      || claims.exp <= now
    ) return null;
    return claims;
  } catch {
    return null;
  }
}

function send(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

export function createServer(mode = "vulnerable") {
  if (mode !== "vulnerable" && mode !== "secure") throw new Error(`Unknown lab mode: ${mode}`);
  return httpCreateServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (request.method === "GET" && url.pathname === "/token") {
      return send(response, 200, { token: issueUserToken() });
    }
    if (request.method === "GET" && url.pathname === "/admin") {
      const authorization = request.headers.authorization ?? "";
      const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
      const claims = mode === "vulnerable" ? decodePayload(token) : verifyToken(token);
      if (!claims) return send(response, 401, { error: "invalid token" });
      return claims.role === "admin"
        ? send(response, 200, { message: "synthetic admin resource", subject: claims.sub })
        : send(response, 403, { error: "admin role required" });
    }
    return send(response, 404, { error: "not found" });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.env.LAB_MODE ?? "vulnerable";
  const server = createServer(mode);
  server.listen(4312, "127.0.0.1", () => {
    console.log(`JWT lab (${mode}) listening at http://127.0.0.1:4312 (ephemeral local RSA key)`);
  });
}
