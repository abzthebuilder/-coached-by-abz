// Runs the hourly jobs now: check-in reminders and deleting old applications. The app does this on its own;
// this script is for testing or running it by hand: npx tsx scripts/run-reminders.ts
import "dotenv/config";
import { runCheckInReminders } from "../src/lib/reminders";
import { purgeStaleLeads } from "../src/lib/maintenance";
import { db } from "../src/lib/db";

async function main() {
  const now = process.env.REMINDER_NOW ? new Date(process.env.REMINDER_NOW) : new Date();
  console.log(`reminders sent: ${await runCheckInReminders(now)}`);
  console.log(`old applications deleted: ${await purgeStaleLeads()}`);
}

main().finally(() => db.$disconnect());
