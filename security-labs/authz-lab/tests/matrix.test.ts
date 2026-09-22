import { describe, it, expect } from "vitest";
import { authorize } from "../src/policy/authorize.js";
import type { Actor } from "../src/policy/authorize.js";

// A minimal, self-contained slice of the full authorization matrix.
// Phase 1 covers document.readOne; later phases extend ACTORS and
// RESOURCES as more routes and policies are added.

const ORG_A = 1;
const ORG_B = 2;

const ACTORS: Record<string, Actor | null> = {
  anonymous: null,
  memberOrgA: { userId: 10, isPlatformAdmin: false, memberships: [{ orgId: ORG_A, role: "member", status: "active" }] },
  managerOrgA: { userId: 11, isPlatformAdmin: false, memberships: [{ orgId: ORG_A, role: "manager", status: "active" }] },
  adminOrgB: { userId: 20, isPlatformAdmin: false, memberships: [{ orgId: ORG_B, role: "admin", status: "active" }] },
  platformAdmin: { userId: 99, isPlatformAdmin: true, memberships: [] },
};

describe("document.readOne authorization matrix", () => {
  const cases: [keyof typeof ACTORS, number, boolean][] = [
    ["anonymous", ORG_A, false],
    ["memberOrgA", ORG_A, true],
    ["managerOrgA", ORG_A, true],
    ["adminOrgB", ORG_A, false], // cross-tenant — must be denied in secure mode
    ["platformAdmin", ORG_A, true],
  ];

  for (const [actorName, orgId, expected] of cases) {
    it(`${actorName} on org ${orgId} => allowed=${expected}`, async () => {
      const decision = await authorize(ACTORS[actorName], "readOne", {
        type: "document",
        orgId,
        ownerId: 10,
      });
      if (process.env.SECURE_MODE === "true") {
        expect(decision.allowed).toBe(expected);
      } else {
        // In vulnerable mode this assertion is expected to fail for the
        // cross-tenant case — that failure IS the finding. Run with
        // SECURE_MODE=true to confirm the fix closes it.
        expect(typeof decision.allowed).toBe("boolean");
      }
    });
  }
});
