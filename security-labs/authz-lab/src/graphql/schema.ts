import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express4";
import { pool } from "../db/pool.js";
import { FLAWS } from "../flaws.js";
import type { Actor } from "../policy/authorize.js";

const typeDefs = `#graphql
  type User {
    id: Int!
    email: String!
    role: String
    isPlatformAdmin: Boolean
  }

  type Query {
    user(id: Int!, orgId: Int!): User
  }
`;

// --- Flaw 11 / secure: GraphQL field authorization failure ---
// Vulnerable: role and isPlatformAdmin resolve for ANY caller who can
// query a user at all — field-level sensitivity is never checked, only
// "can you see a User object" (query-level), not "can you see THIS field."
// Secure: those two fields return null unless the caller is an admin+ in
// the same org as the target, or a platform admin.
const resolvers = {
  User: {
    role: async (parent: any, _args: unknown, ctx: { actor: Actor | null }) => {
      if (FLAWS.graphqlFieldAuthz) return parent._role;
      const isPrivileged =
        ctx.actor?.isPlatformAdmin ||
        ctx.actor?.memberships.some(
          (m) => m.orgId === parent.orgId && (m.role === "admin" || m.role === "owner")
        );
      return isPrivileged ? parent._role : null;
    },
    isPlatformAdmin: async (parent: any, _args: unknown, ctx: { actor: Actor | null }) => {
      if (FLAWS.graphqlFieldAuthz) return parent._isPlatformAdmin;
      return ctx.actor?.isPlatformAdmin ? parent._isPlatformAdmin : null;
    },
  },
  Query: {
    user: async (_parent: unknown, args: { id: number; orgId: number }) => {
      const res = await pool.query(
        `SELECT u.id, u.email, u.is_platform_admin, m.role
         FROM users u LEFT JOIN memberships m ON m.user_id = u.id AND m.org_id = $2
         WHERE u.id = $1`,
        [args.id, args.orgId]
      );
      const row = res.rows[0];
      if (!row) return null;
      return {
        id: row.id,
        email: row.email,
        orgId: args.orgId,
        _role: row.role,
        _isPlatformAdmin: row.is_platform_admin,
      };
    },
  },
};

export async function buildGraphQLMiddleware() {
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  return expressMiddleware(server, {
    context: async ({ req }: any) => ({ actor: req.actor }),
  });
}
