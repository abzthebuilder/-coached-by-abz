// Runs once when the server starts. Starts the hourly jobs: check-in reminder emails (only if email is set up)
// and deleting applications older than 12 months that never became clients.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production" || process.env.DISABLE_REMINDERS === "1") return;
  const { startReminderLoop } = await import("./lib/reminders");
  startReminderLoop();
}
