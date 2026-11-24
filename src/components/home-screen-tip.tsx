"use client";
import { useEffect, useState } from "react";

const KEY = "abz-home-tip-dismissed";

/** On iPhone/iPad Safari, suggests adding the portal to the home screen. Shown until dismissed. */
export function HomeScreenTip() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
      setShow(ios && !standalone && localStorage.getItem(KEY) !== "1");
    } catch {
      setShow(false);
    }
  }, []);
  if (!show) return null;
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-gold/40 bg-gold/5 p-4 text-sm">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mt-0.5 shrink-0">
        <path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
      </svg>
      <p className="flex-1 text-mute">
        <strong className="text-bone">Use it like an app.</strong> Tap the <strong className="text-bone">Share</strong> button in Safari,
        then <strong className="text-bone">Add to Home Screen</strong>.
      </p>
      <button
        type="button"
        onClick={() => {
          try {
            localStorage.setItem(KEY, "1");
          } catch {}
          setShow(false);
        }}
        className="-m-2 min-h-11 min-w-11 text-mute"
        aria-label="Hide this tip"
      >
        ✕
      </button>
    </div>
  );
}
