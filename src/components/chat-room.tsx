"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  deleteMessageAction,
  pinMessageAction,
  postMessageAction,
  reportMessageAction,
  toggleReactionAction,
} from "@/app/actions/community";
import { REACTIONS } from "@/content/community";
import { cx } from "./ui";

type ChatMessage = {
  id: string;
  body: string;
  at: string;
  author: string;
  authorIsCoach: boolean;
  mine: boolean;
  pinned: boolean;
  image: { url: string; w: number | null; h: number | null } | null;
  reactions: { emoji: string; count: number; mine: boolean }[];
  reports?: number;
};

/**
 * Shrinks a photo on the phone before upload (max 1600 px, JPEG). Re-drawing it also drops hidden
 * details like location. If the browser can't open the file, the original is sent and the server checks it.
 */
async function shrinkPhoto(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.85));
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}
type Data = { messages: ChatMessage[]; pinned: ChatMessage | null; hasEarlier: boolean };

const POLL_MS = 4000;

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}
/** Scrolls to the very end, so the message box sits below the newest message instead of covering it. */
const scrollToEnd = (smooth = false) => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: smooth ? "smooth" : "auto" });
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

export function ChatRoom({ initial, isCoach }: { initial: Data; isCoach: boolean }) {
  const [messages, setMessages] = useState(initial.messages);
  const [pinned, setPinned] = useState(initial.pinned);
  const [hasEarlier, setHasEarlier] = useState(initial.hasEarlier);
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [mounted, setMounted] = useState(false);
  const oldest = useRef<string | null>(initial.messages[0]?.at ?? null);
  const lastCount = useRef(initial.messages.length);

  const refresh = useCallback(async () => {
    const from = oldest.current ?? new Date(Date.now() - 365 * 86400000).toISOString();
    try {
      const res = await fetch(`/api/community?from=${encodeURIComponent(from)}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as Data;
      setMessages(data.messages);
      setPinned(data.pinned);
      if (!oldest.current && data.messages[0]) oldest.current = data.messages[0].at;
    } catch {
      /* offline: try again next time */
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    scrollToEnd();
    const t = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
    return () => window.clearInterval(t);
  }, [refresh]);

  // Follow new messages if you're already near the bottom.
  useEffect(() => {
    if (messages.length > lastCount.current) {
      const nearBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 400;
      if (nearBottom) scrollToEnd(true);
    }
    lastCount.current = messages.length;
  }, [messages.length]);

  async function loadEarlier() {
    if (!oldest.current) return;
    const res = await fetch(`/api/community?before=${encodeURIComponent(oldest.current)}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as Data;
    if (data.messages[0]) oldest.current = data.messages[0].at;
    setMessages((m) => [...data.messages, ...m]);
    setHasEarlier(data.hasEarlier);
  }

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    setError("");
    const blob = await shrinkPhoto(file);
    if (photo) URL.revokeObjectURL(photo.url);
    setPhoto({ blob, url: URL.createObjectURL(blob) });
    if (fileInput.current) fileInput.current.value = "";
  }

  function clearPhoto() {
    if (photo) URL.revokeObjectURL(photo.url);
    setPhoto(null);
  }

  async function send(e?: FormEvent) {
    e?.preventDefault();
    if ((!draft.trim() && !photo) || sending) return;
    setSending(true);
    setError("");
    const fd = new FormData();
    fd.set("body", draft);
    if (photo) fd.set("photo", new File([photo.blob], "photo.jpg", { type: photo.blob.type || "image/jpeg" }));
    const res = await postMessageAction(fd);
    setSending(false);
    if (!res.ok) return setError(res.error);
    setDraft("");
    clearPhoto();
    await refresh();
    scrollToEnd(true);
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Desktop: Enter sends, Shift+Enter is a new line. Phones keep Enter as a new line.
    if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer: fine)").matches) {
      e.preventDefault();
      send();
    }
  }

  async function act(fn: () => Promise<{ ok: boolean; error?: string }>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    const res = await fn();
    if (!res.ok) setError(res.error ?? "That didn't work.");
    setOpen(null);
    await refresh();
  }

  return (
    <div>
      {pinned && (
        <div className="sticky top-14 z-10 -mx-4 mb-3 border-b border-gold/30 bg-ink/95 px-4 py-2 backdrop-blur">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gold">📌 Pinned by {pinned.author}</div>
          <p className="line-clamp-2 whitespace-pre-line text-sm">{pinned.body || (pinned.image ? "📷 Photo" : "")}</p>
        </div>
      )}

      {hasEarlier && (
        <button onClick={loadEarlier} className="mb-3 min-h-11 w-full rounded-xl border border-line text-sm text-mute">
          Load earlier messages
        </button>
      )}

      {messages.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-mute">No messages yet. Say hello!</p>
      )}

      <ol className="space-y-2" aria-label="Messages">
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const newDay = mounted && (!prev || new Date(prev.at).toDateString() !== new Date(m.at).toDateString());
          const grouped = prev && prev.author === m.author && prev.authorIsCoach === m.authorIsCoach && !newDay && Date.parse(m.at) - Date.parse(prev.at) < 5 * 60000;
          const isOpen = open === m.id;
          return (
            <li key={m.id}>
              {newDay && (
                <div className="my-4 text-center text-xs font-semibold uppercase tracking-wide text-faint">{dayLabel(m.at)}</div>
              )}
              <div className={cx("flex flex-col", m.mine ? "items-end" : "items-start")}>
                {!grouped && (
                  <div className={cx("mb-1 flex items-center gap-2 px-1 text-xs", m.mine ? "flex-row-reverse" : "")}>
                    <span className={cx("font-semibold", m.authorIsCoach ? "text-gold" : "text-mute")}>{m.mine ? "You" : m.author}</span>
                    {m.authorIsCoach && <span className="rounded bg-gold px-1 text-[10px] font-bold uppercase text-ink">Coach</span>}
                    <span className="text-faint">{mounted ? timeLabel(m.at) : ""}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : m.id)}
                  aria-expanded={isOpen}
                  aria-label={`Message from ${m.mine ? "you" : m.author}. Tap for options.`}
                  className={cx(
                    "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl text-left text-[15px] leading-snug",
                    m.image ? "w-72 p-1.5" : "px-3.5 py-2.5",
                    m.mine ? "rounded-br-md bg-gold text-ink" : m.authorIsCoach ? "rounded-bl-md border border-gold/40 bg-gold/10" : "rounded-bl-md bg-char-2",
                  )}
                >
                  {m.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.image.url}
                      alt={m.body ? `Photo: ${m.body.slice(0, 80)}` : `Photo from ${m.mine ? "you" : m.author}`}
                      loading="lazy"
                      className="max-h-96 w-full rounded-xl bg-char-3 object-cover"
                      style={m.image.w && m.image.h ? { aspectRatio: `${m.image.w} / ${m.image.h}` } : undefined}
                    />
                  )}
                  {m.body && <span className={cx("block", m.image && "px-2 pb-1 pt-2")}>{m.body}</span>}
                </button>
                {(m.reactions.length > 0 || (isCoach && (m.reports ?? 0) > 0)) && (
                  <div className={cx("mt-1 flex flex-wrap gap-1", m.mine ? "justify-end" : "")}>
                    {m.reactions.map((r) => (
                      <button
                        key={r.emoji}
                        onClick={() => act(() => toggleReactionAction(m.id, r.emoji))}
                        aria-pressed={r.mine}
                        aria-label={`${r.emoji} ${r.count}`}
                        className={cx("min-h-8 rounded-full border px-2 text-sm", r.mine ? "border-gold bg-gold/15" : "border-line bg-char")}
                      >
                        {r.emoji} <span className="tabular text-xs">{r.count}</span>
                      </button>
                    ))}
                    {isCoach && (m.reports ?? 0) > 0 && (
                      <span className="rounded-full bg-warn/15 px-2 py-1 text-xs font-semibold text-warn">Reported</span>
                    )}
                  </div>
                )}
                {isOpen && (
                  <div className={cx("mt-1 flex max-w-full flex-wrap items-center gap-1 rounded-xl border border-line bg-char p-1", m.mine ? "justify-end" : "")}>
                    {REACTIONS.map((e) => (
                      <button key={e} onClick={() => act(() => toggleReactionAction(m.id, e))} className="min-h-10 min-w-10 rounded-lg text-lg" aria-label={`React ${e}`}>
                        {e}
                      </button>
                    ))}
                    {m.image && (
                      <button
                        onClick={() => {
                          setViewing(m.image!.url);
                          setOpen(null);
                        }}
                        className="min-h-10 rounded-lg px-2 text-sm font-semibold"
                      >
                        View photo
                      </button>
                    )}
                    {isCoach && (
                      <button onClick={() => act(() => pinMessageAction(m.id, !m.pinned))} className="min-h-10 rounded-lg px-2 text-sm text-gold">
                        {m.pinned ? "Unpin" : "Pin"}
                      </button>
                    )}
                    {!m.mine && !isCoach && (
                      <button onClick={() => act(() => reportMessageAction(m.id), "Report this message to ABZ?")} className="min-h-10 rounded-lg px-2 text-sm text-mute">
                        Report
                      </button>
                    )}
                    {(m.mine || isCoach) && (
                      <button onClick={() => act(() => deleteMessageAction(m.id), "Delete this message for everyone?")} className="min-h-10 rounded-lg px-2 text-sm text-warn">
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <form onSubmit={send} className="sticky bottom-20 z-10 mt-4 md:bottom-4">
        {error && (
          <p role="alert" className="mb-2 rounded-lg bg-warn/10 px-3 py-2 text-sm text-warn">
            {error}
          </p>
        )}
        <div className="rounded-2xl border border-line bg-char p-2 shadow-lg shadow-black/60">
          {photo && (
            <div className="mb-2 flex items-center gap-3 px-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="Photo to send" className="h-16 w-16 rounded-lg object-cover" />
              <span className="flex-1 text-sm text-mute">Photo ready to send</span>
              <button type="button" onClick={clearPhoto} className="min-h-10 rounded-lg px-2 text-sm text-mute" aria-label="Remove photo">
                ✕ Remove
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            aria-label="Choose a photo"
            onChange={(e) => pickPhoto(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-mute hover:text-gold"
            aria-label="Add a photo"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="5" width="18" height="15" rx="3" />
              <circle cx="12" cy="12.5" r="3.5" />
              <path d="M8 5l1.5-2h5L16 5" />
            </svg>
          </button>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            rows={Math.min(4, Math.max(1, draft.split("\n").length))}
            maxLength={1000}
            placeholder={photo ? "Add a caption (optional)" : "Message the community"}
            aria-label="Message"
            className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2.5 text-[16px] outline-none placeholder:text-faint"
          />
          <button
            type="submit"
            disabled={(!draft.trim() && !photo) || sending}
            className="min-h-11 shrink-0 rounded-xl bg-gold px-4 font-semibold text-ink disabled:opacity-40"
          >
            {sending ? "…" : "Send"}
          </button>
          </div>
        </div>
      </form>

      {viewing && (
        <div role="dialog" aria-label="Photo" className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-3" onClick={() => setViewing(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={viewing} alt="Full size photo" className="max-h-full max-w-full rounded-lg object-contain" />
          <button
            type="button"
            onClick={() => setViewing(null)}
            className="absolute right-3 top-3 flex min-h-11 min-w-11 items-center justify-center rounded-full bg-char text-lg"
            aria-label="Close photo"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
