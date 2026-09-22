import bcrypt from "bcrypt";
import { pool } from "./pool.js";
import { issueToken } from "../policy/auth.js";

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error("Usage: tsx src/db/login.ts <email> <password>");
  process.exit(1);
}

async function main() {
  const res = await pool.query(
    `SELECT id, password_hash, token_version FROM users WHERE email = $1`,
    [email]
  );
  const user = res.rows[0];
  if (!user) { console.error("No such user"); process.exit(1); }
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) { console.error("Bad password"); process.exit(1); }
  console.log(issueToken(user.id, user.token_version));
  await pool.end();
}

main();
