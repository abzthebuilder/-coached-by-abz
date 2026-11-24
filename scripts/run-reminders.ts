// Sends any check-in reminders that are due right now. The app does this hourly on its own;
// this script is for testing or running it by hand: npx tsx scripts/run-reminders.ts
import "dotenv/config";
import { runCheckInReminders } from "../src/lib/reminders";
import { db } from "../src/lib/db";

async function main() {
  const sent = await runCheckInReminders(process.env.REMINDER_NOW ? new Date(process.env.REMINDER_NOW) : new Date());
  console.log(`reminders sent: ${sent}`);
}

main().finally(() => db.$disconnect());
