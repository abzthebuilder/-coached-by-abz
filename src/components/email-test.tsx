"use client";
import { useState } from "react";
import { sendTestEmailAction } from "@/app/actions/email";

export function EmailTestButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function send() {
    setBusy(true);
    setMsg("");
    try {
      const res = await sendTestEmailAction();
      setMsg(res.ok ? res.message : res.error);
    } catch {
      setMsg("The test couldn't be sent. Try again in a minute.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3">
      <button type="button" onClick={send} disabled={busy} className="min-h-12 w-full rounded-xl border border-line font-semibold disabled:opacity-50">
        {busy ? "Sending…" : "Send me a test email"}
      </button>
      {msg && (
        <p role="status" className="text-sm text-gold">
          {msg}
        </p>
      )}
    </div>
  );
}
