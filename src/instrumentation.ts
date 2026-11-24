// Runs once when the server starts. Starts the hourly check-in reminder emails (only does anything if email is set up).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production" || process.env.DISABLE_REMINDERS === "1") return;
  const { startReminderLoop } = await import("./lib/reminders");
  startReminderLoop();
}
