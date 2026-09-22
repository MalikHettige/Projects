import { pool } from "../db/pool.js";
import { FLAWS } from "../flaws.js";

export type Role = "owner" | "admin" | "manager" | "member" | "guest";

export type Decision = {
  allowed: boolean;
  reason: string;
  policy: string;
  actorId?: number;
  tenantId?: number;
};

export type Actor = {
  userId: number;
  isPlatformAdmin: boolean;
  // effective memberships loaded fresh from the DB per request —
  // never trusted from a token, so role-downgrade persistence (flaw 8)
  // has to be explicitly reintroduced rather than happening by default.
  memberships: { orgId: number; role: Role; status: string }[];
};

const ROLE_RANK: Record<Role, number> = {
  guest: 0,
  member: 1,
  manager: 2,
  admin: 3,
  owner: 4,
};

function roleAtLeast(role: Role, min: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

async function log(decision: Decision, action: string, resource: string): Promise<void> {
  await pool.query(
    `INSERT INTO audit_log (actor_id, tenant_id, action, resource, allowed, reason, policy)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      decision.actorId ?? null,
      decision.tenantId ?? null,
      action,
      resource,
      decision.allowed,
      decision.reason,
      decision.policy,
    ]
  );
}

/**
 * Central authorization decision point. Every route (REST v1/v2, GraphQL
 * resolvers, workers, webhooks, admin portal) is meant to call this rather
 * than rolling its own check. Flags in FLAWS deliberately weaken specific
 * branches so each flaw can be toggled and diffed against its secure form.
 */
export async function authorize(
  actor: Actor | null,
  action: string,
  resource: { type: string; orgId: number; ownerId?: number }
): Promise<Decision> {
  const policy = `${resource.type}.${action}`;

  if (!actor) {
    const d: Decision = { allowed: false, reason: "not authenticated", policy };
    await log(d, action, resource.type);
    return d;
  }

  if (actor.isPlatformAdmin) {
    const d: Decision = {
      allowed: true,
      reason: "platform admin",
      policy,
      actorId: actor.userId,
      tenantId: resource.orgId,
    };
    await log(d, action, resource.type);
    return d;
  }

  const membership = actor.memberships.find((m) => m.orgId === resource.orgId);

  // --- Flaw 3 / secure: cross-tenant access ---
  // Vulnerable: falls back to *any* membership if none matches this org.
  // Secure: no membership in this org => denied, full stop.
  const effectiveMembership = FLAWS.crossTenant
    ? membership ?? actor.memberships[0]
    : membership;

  if (!effectiveMembership || effectiveMembership.status !== "active") {
    const d: Decision = {
      allowed: false,
      reason: "no active membership in tenant",
      policy,
      actorId: actor.userId,
      tenantId: resource.orgId,
    };
    await log(d, action, resource.type);
    return d;
  }

  const requiredRole = REQUIRED_ROLE[policy] ?? "member";

  // --- Flaw 2 / secure: vertical privilege escalation ---
  // Vulnerable: role check can be skipped entirely for "read"-shaped actions.
  const roleOk = FLAWS.verticalEscalation && action.startsWith("read")
    ? true
    : roleAtLeast(effectiveMembership.role, requiredRole);

  if (!roleOk) {
    const d: Decision = {
      allowed: false,
      reason: `role ${effectiveMembership.role} below required ${requiredRole}`,
      policy,
      actorId: actor.userId,
      tenantId: resource.orgId,
    };
    await log(d, action, resource.type);
    return d;
  }

  // --- Flaw 1 / secure: horizontal IDOR ---
  // Vulnerable: ownership is never checked for actions marked owner-scoped.
  if (resource.ownerId !== undefined && OWNER_SCOPED.has(policy)) {
    const isOwner = resource.ownerId === actor.userId;
    const roleOverridesOwnership = roleAtLeast(effectiveMembership.role, "manager");
    if (!FLAWS.idor && !isOwner && !roleOverridesOwnership) {
      const d: Decision = {
        allowed: false,
        reason: "not resource owner and role does not override",
        policy,
        actorId: actor.userId,
        tenantId: resource.orgId,
      };
      await log(d, action, resource.type);
      return d;
    }
  }

  const d: Decision = {
    allowed: true,
    reason: "policy checks passed",
    policy,
    actorId: actor.userId,
    tenantId: resource.orgId,
  };
  await log(d, action, resource.type);
  return d;
}

// Minimum role required per "resourceType.action" policy key.
const REQUIRED_ROLE: Record<string, Role> = {
  "document.readOne": "member",
  "document.readList": "member",
  "document.create": "member",
  "document.update": "member",
  "document.approve": "manager",
  "document.publish": "manager",
  "document.delete": "manager",
  "membership.changeRole": "admin",
  "membership.remove": "admin",
  "org.transferBilling": "owner",
  "export.create": "manager",
  "export.download": "manager",
  "webhook.create": "admin",
};

// Policies where ownership (resource.ownerId === actor.userId) matters,
// unless the actor's role is high enough to override it (manager+).
const OWNER_SCOPED = new Set(["document.update", "document.delete", "file.download"]);
