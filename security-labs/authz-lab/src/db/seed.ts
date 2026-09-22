import bcrypt from "bcrypt";
import { pool } from "./pool.js";

const PASSWORD = "Lab-Password-123!"; // fake, documented, dev-only

async function makeUser(email: string, isPlatformAdmin = false): Promise<number> {
  const hash = await bcrypt.hash(PASSWORD, 10);
  const res = await pool.query(
    `INSERT INTO users (email, password_hash, is_platform_admin)
     VALUES ($1, $2, $3) RETURNING id`,
    [email, hash, isPlatformAdmin]
  );
  return res.rows[0].id;
}

async function makeOrg(name: string, parentOrgId: number | null = null): Promise<number> {
  const res = await pool.query(
    `INSERT INTO orgs (name, parent_org_id) VALUES ($1, $2) RETURNING id`,
    [name, parentOrgId]
  );
  return res.rows[0].id;
}

async function addMembership(userId: number, orgId: number, role: string): Promise<void> {
  await pool.query(
    `INSERT INTO memberships (user_id, org_id, role) VALUES ($1, $2, $3)`,
    [userId, orgId, role]
  );
}

async function main() {
  console.log("Seeding... all passwords:", PASSWORD);

  const orgA = await makeOrg("Acme Corp");
  const orgASub = await makeOrg("Acme Subsidiary", orgA);
  const orgB = await makeOrg("Globex Inc");

  const platformAdmin = await makeUser("platform-admin@lab.test", true);

  const aOwner = await makeUser("owner@acme.test");
  const aAdmin = await makeUser("admin@acme.test");
  const aManager = await makeUser("manager@acme.test");
  const aMember = await makeUser("member@acme.test");
  const aGuest = await makeUser("guest@acme.test");

  const bOwner = await makeUser("owner@globex.test");
  const bMember = await makeUser("member@globex.test");

  await addMembership(aOwner, orgA, "owner");
  await addMembership(aAdmin, orgA, "admin");
  await addMembership(aManager, orgA, "manager");
  await addMembership(aMember, orgA, "member");
  await addMembership(aGuest, orgA, "guest");
  await addMembership(aManager, orgASub, "manager");

  await addMembership(bOwner, orgB, "owner");
  await addMembership(bMember, orgB, "member");

  const doc1 = await pool.query(
    `INSERT INTO documents (org_id, owner_id, title, body, state)
     VALUES ($1,$2,$3,$4,'draft') RETURNING id`,
    [orgA, aMember, "Acme Q3 Plan", "Draft content"]
  );

  await pool.query(
    `INSERT INTO documents (org_id, owner_id, title, body, state)
     VALUES ($1,$2,$3,$4,'published')`,
    [orgB, bMember, "Globex Roadmap", "Confidential roadmap content"]
  );

  await pool.query(
    `INSERT INTO files (org_id, document_id, uploader_id, filename, storage_key)
     VALUES ($1,$2,$3,$4,$5)`,
    [orgA, doc1.rows[0].id, aMember, "q3-plan.pdf", `local/${orgA}/q3-plan.pdf`]
  );

  console.log("Seed complete:");
  console.log({ orgA, orgASub, orgB, platformAdmin, aOwner, aAdmin, aManager, aMember, aGuest, bOwner, bMember });

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
