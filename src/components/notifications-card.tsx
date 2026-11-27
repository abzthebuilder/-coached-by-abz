"use client";
import { useEffect, useState } from "react";
import {
  removePushSubscriptionAction,
  savePushSubscriptionAction,
  sendTestPushAction,
  setCommunityNotifyAction,
} from "@/app/actions/notifications";
import { cx } from "./ui";

type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

function keyBytes(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** True when this subscription was made with the site's current key (an old one would be refused). */
function madeWithKey(sub: PushSubscription, publicKey: string) {
  const key = sub.options?.applicationServerKey;
  if (!key) return true; // the browser doesn't say: assume it's fine
  const a = new Uint8Array(key);
  const b = keyBytes(publicKey);
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

async function currentSubscription() {
  const reg = await navigator.serviceWorker.getRegistration("/");
  return (await reg?.pushManager.getSubscription()) ?? null;
}

async function registration() {
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  return reg;
}

/**
 * Turns phone notifications on or off for this device, and (for community members) chooses which
 * community messages to be notified about. `compact` shows a one-line prompt, used in the chat.
 */
export function NotificationsCard({
  publicKey,
  communityNotify,
  compact = false,
}: {
  publicKey: string;
  communityNotify?: "all" | "coach" | "off" | null;
  compact?: boolean;
}) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [pref, setPref] = useState(communityNotify ?? null);

  useEffect(() => {
    (async () => {
      try {
        const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
        const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
        const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
        if (ios && !standalone) return setState("ios-install");
        if (!supported) return setState("unsupported");
        if (Notification.permission === "denied") return setState("denied");
        const sub = await currentSubscription();
        if (sub && !madeWithKey(sub, publicKey)) {
          // Made with an old key: notifications to it would be refused, so start again.
          await removePushSubscriptionAction(sub.endpoint);
          await sub.unsubscribe().catch(() => false);
        } else if (sub) {
          await savePushSubscriptionAction(sub.toJSON()); // keeps the server's copy up to date
          return setState("on");
        }
        setState("off");
      } catch {
        setState("unsupported");
      }
    })();
  }, []);

  async function turnOn() {
    setBusy(true);
    setMsg("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await registration();
      let sub = await reg.pushManager.getSubscription();
      if (sub && !madeWithKey(sub, publicKey)) {
        await sub.unsubscribe().catch(() => false);
        sub = null;
      }
      sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
      const res = await savePushSubscriptionAction(sub.toJSON());
      if (!res.ok) throw new Error(res.error);
      setState("on");
      setMsg("Notifications are on for this device.");
    } catch (e) {
      const why = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      setMsg(`Notifications couldn't be turned on. Try again, or check your phone's settings. (${why.slice(0, 120)})`);
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    setMsg("");
    try {
      const sub = await currentSubscription();
      if (sub) {
        await removePushSubscriptionAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
      setMsg("Notifications are off for this device.");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setMsg("");
    try {
      const sub = await currentSubscription();
      if (!sub) {
        setState("off");
        setMsg("Notifications aren't set up on this device any more. Tap Turn on notifications.");
        return;
      }
      await savePushSubscriptionAction(sub.toJSON());
      const res = await sendTestPushAction(sub.endpoint);
      if (res.ok) return setMsg(res.message);
      if (res.expired) {
        await sub.unsubscribe().catch(() => false);
        setState("off");
      }
      setMsg(res.error);
    } catch (e) {
      setMsg(`The test couldn't be sent. (${e instanceof Error ? e.message.slice(0, 120) : "unknown error"})`);
    } finally {
      setBusy(false);
    }
  }

  async function choose(v: "all" | "coach" | "off") {
    setPref(v);
    await setCommunityNotifyAction(v);
  }

  if (compact) {
    if (state !== "off") return null;
    return (
      <button
        type="button"
        onClick={turnOn}
        disabled={busy}
        className="mb-3 flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-gold/40 bg-gold/5 px-3 text-left text-sm"
      >
        <span>
          🔔 <span className="font-semibold">Get notified</span> <span className="text-mute">about new messages</span>
        </span>
        <span className="shrink-0 font-semibold text-gold">{busy ? "…" : "Turn on"}</span>
      </button>
    );
  }

  return (
    <div className="space-y-3">
      {state === "loading" && <p className="text-sm text-mute">Checking this device…</p>}
      {state === "ios-install" && (
        <p className="rounded-xl bg-char-2 p-3 text-sm text-mute">
          On iPhone, notifications work once the app is on your Home Screen. In Safari, tap <strong className="text-bone">Share</strong> →{" "}
          <strong className="text-bone">Add to Home Screen</strong>, open the app from the new icon, then come back here.
        </p>
      )}
      {state === "unsupported" && <p className="text-sm text-mute">This browser can&apos;t show notifications. Try Safari on iPhone or Chrome on Android.</p>}
      {state === "denied" && (
        <p className="rounded-xl bg-char-2 p-3 text-sm text-mute">
          Notifications are blocked for this app. Turn them on in your phone&apos;s <strong className="text-bone">Settings → Notifications</strong>, then come
          back here.
        </p>
      )}
      {state === "off" && (
        <button
          type="button"
          onClick={turnOn}
          disabled={busy}
          className="flex min-h-12 w-full items-center justify-center rounded-xl bg-gold font-semibold text-ink disabled:opacity-50"
        >
          {busy ? "Turning on…" : "Turn on notifications"}
        </button>
      )}
      {state === "on" && (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={test} disabled={busy} className="min-h-12 rounded-xl border border-line font-semibold disabled:opacity-50">
            {busy ? "Sending…" : "Send a test"}
          </button>
          <button type="button" onClick={turnOff} disabled={busy} className="min-h-12 rounded-xl border border-line text-sm text-mute">
            Turn off
          </button>
        </div>
      )}
      {msg && (
        <p role="status" className="text-sm text-gold">
          {msg}
        </p>
      )}
      {pref && (
        <fieldset className="pt-1">
          <legend className="label">Community messages</legend>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["all", "All messages"],
                ["coach", "ABZ only"],
                ["off", "Off"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => choose(v)}
                aria-pressed={pref === v}
                className={cx("min-h-11 rounded-xl border px-2 text-sm font-semibold", pref === v ? "border-gold bg-gold text-ink" : "border-line text-mute")}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}
