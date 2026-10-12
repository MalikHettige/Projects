import { Router } from "express";
import { pool } from "../db/pool.js";
import { authorize } from "../policy/authorize.js";
import { FLAWS } from "../flaws.js";

export const internalRouter = Router();

// Not linked from any documented route — the kind of endpoint that only
// shows up in a JS bundle or an old Postman collection. It exists purely
// to test whether "unlinked" is being treated as "protected."
//
// GET /internal/orgs/:orgId/audit-log
internalRouter.get("/internal/orgs/:orgId/audit-log", async (req, res) => {
  const orgId = Number(req.params.orgId);

  // --- Flaw 5 / secure: hidden endpoint access ---
  // Vulnerable: this route skips the shared authorize() call entirely and
  // only checks "is there any actor at all" — no role or admin requirement.
  // Secure: same policy call every other admin-tier route uses.
  if (FLAWS.hiddenEndpoint) {
    if (!req.actor) {
      return res.status(401).json({ error: "not authenticated" });
    }
    // no role check — this is the bug
  } else {
    const decision = await authorize(req.actor, "readList", {
      type: "auditLog",
      orgId,
    });
    if (!decision.allowed) {
      return res.status(403).json({ error: "forbidden", reason: decision.reason });
    }
  }

  const rows = await pool.query(
    `SELECT id, actor_id, tenant_id, action, resource, allowed, reason, policy, created_at
     FROM audit_log WHERE tenant_id = $1 ORDER BY id DESC LIMIT 50`,
    [orgId]
  );
  return res.status(200).json(rows.rows);
});
