import { pool } from "../src/db/pool.js";
const users = await pool.query("SELECT id, email, is_platform_admin FROM users ORDER BY id");
console.log("USERS:", users.rows);
const orgs = await pool.query("SELECT id, name, parent_org_id FROM orgs ORDER BY id");
console.log("ORGS:", orgs.rows);
const docs = await pool.query("SELECT id, org_id, owner_id, title, state FROM documents ORDER BY id");
console.log("DOCS:", docs.rows);
await pool.end();
