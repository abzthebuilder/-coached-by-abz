// Branded emails. They never include health information: only a short note and a link to log in.
import type { Email } from "./email";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const first = (name: string) => name.trim().split(/\s+/)[0] || "there";

function layout(to: string, subject: string, lines: string[], cta: { label: string; url: string }, footnote?: string): Email {
  const html = `<!doctype html><html><body style="margin:0;background:#0a0a0a;font-family:Helvetica,Arial,sans-serif;color:#f4efe4">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#141414;border:1px solid #2e2e2e;border-radius:16px">
<tr><td style="padding:28px 28px 8px;font-size:20px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Coached by <span style="color:#d4af37">ABZ</span></td></tr>
<tr><td style="padding:8px 28px;font-size:16px;line-height:1.55;color:#d6d0c4">${lines.map((l) => `<p style="margin:0 0 14px">${esc(l)}</p>`).join("")}</td></tr>
<tr><td style="padding:6px 28px 28px"><a href="${esc(cta.url)}" style="display:inline-block;background:#d4af37;color:#0a0a0a;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:12px">${esc(cta.label)}</a>
${footnote ? `<p style="margin:18px 0 0;font-size:13px;color:#8a8a8a">${esc(footnote)}</p>` : ""}</td></tr>
</table>
<p style="margin:16px 0 0;font-size:12px;color:#6b6b6b">Coached by ABZ</p>
</td></tr></table></body></html>`;
  const text = `${lines.join("\n\n")}\n\n${cta.label}: ${cta.url}${footnote ? `\n\n${footnote}` : ""}\n\nCoached by ABZ`;
  return { to, subject, html, text };
}

export const emails = {
  invite: (to: string, name: string, link: string) =>
    layout(
      to,
      "Your Coached by ABZ account is ready to set up",
      [`Hi ${first(name)},`, "Welcome to Coached by ABZ. Tap the button below to set your password and open your client portal."],
      { label: "Set up my account", url: link },
      "This link works once and expires in 14 days. If you weren't expecting this email, you can ignore it.",
    ),
  reset: (to: string, name: string, link: string, hours: number) =>
    layout(
      to,
      "Reset your Coached by ABZ password",
      [`Hi ${first(name)},`, "Tap the button below to choose a new password."],
      { label: "Choose a new password", url: link },
      `This link works once and expires in ${hours} hours. If you didn't ask for this, you can ignore this email and your password won't change.`,
    ),
  coachReplied: (to: string, name: string, link: string) =>
    layout(to, "ABZ replied to your check-in", [`Hi ${first(name)},`, "I've replied to your check-in. Log in to read it."], {
      label: "Read my reply",
      url: link,
    }),
  checkInSubmitted: (to: string, clientName: string, link: string) =>
    layout(to, `New check-in from ${clientName}`, [`${clientName} has submitted a check-in.`], { label: "Open check-in", url: link }),
  clientReplied: (to: string, clientName: string, link: string) =>
    layout(to, `${clientName} replied to your message`, [`${clientName} has replied on their check-in.`], { label: "Open conversation", url: link }),
  newLead: (to: string, applicantName: string, link: string) =>
    layout(to, `New application from ${applicantName}`, [`${applicantName} has applied for online coaching.`], { label: "Open application", url: link }),
  test: (to: string, link: string) =>
    layout(to, "Test email from Coached by ABZ", ["Emails from your website are working.", "Invites, password resets, check-in reminders and replies will now arrive by email."], {
      label: "Open my dashboard",
      url: link,
    }),
  reminder: (to: string, name: string, link: string) =>
    layout(
      to,
      "Your check-in is due tomorrow",
      [`Hi ${first(name)},`, "Just a reminder that your check-in is due tomorrow. It only takes a few minutes and helps me keep your plan on track."],
      { label: "Submit my check-in", url: link },
    ),
};
