import express from "express";
import { pool } from "./db/pool.js";
import { resolveActor } from "./policy/auth.js";
import { authorize } from "./policy/authorize.js";
import type { Actor } from "./policy/authorize.js";

export const app = express();
app.use(express.json());

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      actor: Actor | null;
    }
  }
}

app.use(async (req, _res, next) => {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  req.actor = token ? await resolveActor(token) : null;
  next();
});

// GET /api/v1/orgs/:orgId/documents/:id
app.get("/api/v1/orgs/:orgId/documents/:id", async (req, res) => {
  const orgId = Number(req.params.orgId);
  const id = Number(req.params.id);

  const docRes = await pool.query(
    `SELECT id, org_id, owner_id, title, body, state FROM documents
     WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  const doc = docRes.rows[0];
  if (!doc) return res.status(404).json({ error: "not found" });

  const decision = await authorize(req.actor, "readOne", {
    type: "document",
    orgId, // NOTE: intentionally uses the URL's orgId, not doc.org_id —
    // this is what lets FLAW_CROSS_TENANT matter: an attacker supplying
    // their own orgId in the URL while requesting another tenant's
    // document id is exactly the cross-tenant access scenario.
    ownerId: doc.owner_id,
  });

  if (!decision.allowed) {
    return res.status(403).json({ error: "forbidden", reason: decision.reason });
  }
  if (doc.org_id !== orgId) {
    // Even when authorize() allowed it (flaw on), flag the mismatch so
    // the response makes the bug visible rather than silently correct.
    return res.status(200).json({ ...doc, _warning: "cross-tenant document served" });
  }
  return res.status(200).json(doc);
});

const port = Number(process.env.PORT ?? 3000);
if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => console.log(`authz-lab listening on :${port}`));
}
