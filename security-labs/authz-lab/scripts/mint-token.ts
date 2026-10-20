import { issueToken } from "../src/policy/auth.js";
const userId = Number(process.argv[2]);
console.log(issueToken(userId, 0));
