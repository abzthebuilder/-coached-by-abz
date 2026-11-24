"use client";
import { useEffect, useState } from "react";

/** Sends the browser's timezone so "today" matches the client's own day. */
export function TimezoneInput() {
  const [tz, setTz] = useState("");
  useEffect(() => setTz(Intl.DateTimeFormat().resolvedOptions().timeZone), []);
  return <input type="hidden" name="timezone" value={tz} />;
}
