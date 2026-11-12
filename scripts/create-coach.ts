// Creates (or resets the password of) the coach account.
// Usage: npm run create-coach -- you@example.com "Your Name" 'a-long-password'
import "dotenv/config";
import { createPrismaClient } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

const [email, name, password] = process.argv.slice(2);
if (!email || !name || !password || password.length < 10) {
  console.error('Usage: npm run create-coach -- email "Name" password   (password: 10+ characters)');
  process.exit(1);
}
const db = createPrismaClient();
const passwordHash = await bcrypt.hash(password, 12);
const user = await db.user.upsert({
  where: { email: email.toLowerCase() },
  create: { email: email.toLowerCase(), name, passwordHash, role: "COACH", timezone: process.env.APP_TIMEZONE || "Europe/London" },
  update: { name, passwordHash, role: "COACH" },
});
console.log(`Coach account ready: ${user.email}`);
await db.$disconnect();
