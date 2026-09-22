import jwt from "jsonwebtoken";
import { pool } from "../db/pool.js";
import { FLAWS } from "../flaws.js";
import type { Actor, Role } from "./authorize.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev_only_change_me_do_not_reuse";

export function issueToken(userId: number, tokenVersion: number): string {
  return jwt.sign({ sub: userId, tv: tokenVersion }, JWT_SECRET, { expiresIn: "12h" });
}

/**
 * Resolves a JWT into an Actor with freshly-loaded memberships.
 *
 * Flaw 8 / secure: role-downgrade persistence. The token carries the
 * token_version it was issued with. Secure mode rejects tokens whose
 * version no longer matches the user's current token_version (bumped on
 * every role/membership change) — meaning old tokens die immediately.
 * Vulnerable mode ignores tv and treats the token as valid until expiry,
 * so a demoted or removed user keeps their old access until it expires.
 */
export async function resolveActor(token: string): Promise<Actor | null> {
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
  } catch {
    return null;
  }

  const userId = Number(payload.sub);
  const tokenVersion = Number(payload.tv);

  const userRes = await pool.query(
    `SELECT id, token_version, is_platform_admin FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [userId]
  );
  const user = userRes.rows[0];
  if (!user) return null;

  if (!FLAWS.roleDowngradePersistence && user.token_version !== tokenVersion) {
    return null; // secure: stale token, current role may have changed
  }

  const memRes = await pool.query(
    `SELECT org_id, role, status FROM memberships WHERE user_id = $1`,
    [userId]
  );

  return {
    userId: user.id,
    isPlatformAdmin: user.is_platform_admin,
    memberships: memRes.rows.map((r: { org_id: number; role: string; status: string }) => ({
      orgId: r.org_id,
      role: r.role as Role,
      status: r.status as string,
    })),
  };
}

/** Call whenever a user's role/membership/removal changes, in secure mode. */
export async function bumpTokenVersion(userId: number): Promise<void> {
  await pool.query(`UPDATE users SET token_version = token_version + 1 WHERE id = $1`, [userId]);
}
