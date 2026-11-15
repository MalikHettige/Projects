import { Router } from "express";
import { pool } from "../db/pool.js";
import { authorize } from "../policy/authorize.js";
import { FLAWS } from "../flaws.js";

export const invitationsRouter = Router();

// POST /api/v1/orgs/:orgId/invitations   { "email": "...", "role": "member" }
// Admin+ creates an invite. Token is returned directly in the response body
// (no real email system in this lab) so it can be used immediately against
// the accept endpoint below.
invitationsRouter.post("/api/v1/orgs/:orgId/invitations", async (req, res) => {
  const orgId = Number(req.params.orgId);
  const email = String(req.body.email ?? "");
  const role = String(req.body.role ?? "member");

  const decision = await authorize(req.actor, "changeRole", {
    type: "membership",
    orgId,
  });
  if (!decision.allowed) {
    return res.status(403).json({ error: "forbidden", reason: decision.reason });
  }

  const token = Buffer.from(`${orgId}:${email}:${Date.now()}:${Math.random()}`).toString(
    "base64url"
  );
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days

  const inviteRes = await pool.query(
    `INSERT INTO invitations (org_id, email, role, token, invited_by, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, token, expires_at`,
    [orgId, email, role, token, req.actor!.userId, expiresAt]
  );

  return res.status(201).json(inviteRes.rows[0]);
});

async function grantMembership(userId: number, orgId: number, role: string): Promise<void> {
  await pool.query(
    `INSERT INTO memberships (user_id, org_id, role) VALUES ($1,$2,$3)
     ON CONFLICT (user_id, org_id) DO NOTHING`,
    [userId, orgId, role]
  );
}

// POST /api/v1/invitations/:token/accept
// The authenticated caller redeems the invite token and becomes a member
// of the invite's org, at the invite's role. No orgId in the URL — the
// token alone identifies the invite, same as a real invite-link flow.
//
// Two independent flaws live here, toggled separately:
//   FLAW_STALE_INVITE   — is an already-used/expired/revoked token still
//                          treated as valid? (single-request bug, no
//                          concurrency needed)
//   FLAW_RACE_CONDITION — is validity checked and consumed atomically?
//                          (needs concurrent requests to trigger)
// Both off = fully secure. Either on alone = that specific bug. Both on =
// a stale token can also be raced, since nothing is left to protect it.
invitationsRouter.post("/api/v1/invitations/:token/accept", async (req, res) => {
  if (!req.actor) {
    return res.status(401).json({ error: "not authenticated" });
  }
  const token = String(req.params.token);
  const userId = req.actor.userId;

  if (FLAWS.raceCondition) {
    // --- Flaw 9 / secure: race condition (TOCTOU, non-atomic check-then-act) ---
    // The "is this invite still redeemable" check and the write that
    // consumes it are two separate round trips, with a deliberate small
    // delay between them to open a realistic, reliably-hittable window.
    // Two concurrent accept requests (same token, different actors) can
    // both pass the check before either request's UPDATE commits — both
    // go on to grant membership, and a single-use token ends up redeemed
    // more than once.
    const inviteRes = await pool.query(
      `SELECT id, org_id, role, status, expires_at FROM invitations WHERE token = $1`,
      [token]
    );
    const invite = inviteRes.rows[0];
    if (!invite) return res.status(404).json({ error: "invite not found" });

    const stillValid = FLAWS.staleInvite
      ? true // --- Flaw 10 / secure: stale invite acceptance, combined here ---
      : invite.status === "pending" && new Date(invite.expires_at) > new Date();

    if (!stillValid) {
      return res.status(409).json({ error: "invite no longer valid", status: invite.status });
    }

    // The window. A real deployment might have this gap from a cache
    // lookup, a second DB call, an email-match check, etc. — it's explicit
    // here so the race is reproducible with a handful of parallel requests
    // instead of needing a lucky sub-millisecond hit.
    await new Promise((resolve) => setTimeout(resolve, 150));

    await grantMembership(userId, invite.org_id, invite.role);
    await pool.query(`UPDATE invitations SET status = 'accepted' WHERE id = $1`, [invite.id]);

    return res.status(200).json({ orgId: invite.org_id, role: invite.role });
  }

  // Secure-concurrency path: claim the invite in one atomic statement.
  // FLAW_STALE_INVITE still changes WHAT counts as claimable — if it's on,
  // any existing token claims (status/expiry ignored); if off, only a
  // still-pending, still-unexpired token claims. Either way the statement
  // itself is atomic, so this path is never racy.
  const claimRes = FLAWS.staleInvite
    ? await pool.query(
        `UPDATE invitations SET status = 'accepted' WHERE token = $1 RETURNING id, org_id, role`,
        [token]
      )
    : await pool.query(
        `UPDATE invitations
           SET status = 'accepted'
         WHERE token = $1
           AND status = 'pending'
           AND expires_at > now()
         RETURNING id, org_id, role`,
        [token]
      );

  const claimed = claimRes.rows[0];
  if (!claimed) {
    // Only reachable on the secure (non-stale) branch — a stale-but-off
    // token exists but failed pending/expiry, or the token is unknown.
    const exists = await pool.query(`SELECT 1 FROM invitations WHERE token = $1`, [token]);
    return res
      .status(exists.rows[0] ? 409 : 404)
      .json({ error: exists.rows[0] ? "invite no longer valid" : "invite not found" });
  }

  await grantMembership(userId, claimed.org_id, claimed.role);
  return res.status(200).json({ orgId: claimed.org_id, role: claimed.role });
});
