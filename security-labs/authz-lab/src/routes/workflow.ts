import { Router } from "express";
import { pool } from "../db/pool.js";
import { authorize } from "../policy/authorize.js";
import { FLAWS } from "../flaws.js";

export const workflowRouter = Router();

// Valid transitions in the secure state machine.
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ["submitted"],
  submitted: ["approved", "draft"], // can be sent back for edits
  approved: ["published"],
  published: ["archived"],
  archived: [],
};

// PATCH /api/v1/orgs/:orgId/documents/:id/transition  { "to": "published" }
workflowRouter.patch("/api/v1/orgs/:orgId/documents/:id/transition", async (req, res) => {
  const orgId = Number(req.params.orgId);
  const id = Number(req.params.id);
  const to = String(req.body.to ?? "");

  const docRes = await pool.query(
    `SELECT id, org_id, owner_id, state FROM documents WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  const doc = docRes.rows[0];
  if (!doc) return res.status(404).json({ error: "not found" });

  const decision = await authorize(req.actor, "publish", {
    type: "document",
    orgId,
    ownerId: doc.owner_id,
  });
  if (!decision.allowed) {
    return res.status(403).json({ error: "forbidden", reason: decision.reason });
  }

  // --- Flaw 6 / secure: workflow-step skipping ---
  // Vulnerable: any requested `to` state is accepted as long as role/tenant
  // checks passed above — the state machine itself is never consulted.
  // Secure: the transition must appear in ALLOWED_TRANSITIONS[current state].
  const allowedNext = ALLOWED_TRANSITIONS[doc.state] ?? [];
  const transitionOk = FLAWS.workflowSkip ? true : allowedNext.includes(to);

  if (!transitionOk) {
    return res.status(409).json({
      error: "invalid transition",
      from: doc.state,
      to,
      allowed: allowedNext,
    });
  }

  const updated = await pool.query(
    `UPDATE documents SET state = $1, updated_at = now() WHERE id = $2 RETURNING id, org_id, state`,
    [to, id]
  );
  return res.status(200).json(updated.rows[0]);
});
