"use client";
import { useState } from "react";
import { Empty, cx } from "@/components/ui";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const short = (d: string) => `${Number(d.slice(8))} ${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;

export type PhotoItem = { id: string; day: string; pose: "FRONT" | "SIDE" | "BACK" | "OTHER" };
const POSES = ["FRONT", "SIDE", "BACK", "OTHER"] as const;

export function PhotoCompare({ photos, deleteAction }: { photos: PhotoItem[]; deleteAction?: (fd: FormData) => Promise<void> }) {
  const posesWith = POSES.filter((p) => photos.some((x) => x.pose === p));
  const [pose, setPose] = useState<PhotoItem["pose"]>(posesWith[0] ?? "FRONT");
  const list = photos.filter((p) => p.pose === pose).sort((a, b) => a.day.localeCompare(b.day));
  const [a, setA] = useState<string>("");
  const [b, setB] = useState<string>("");
  const left = list.find((p) => p.id === a) ?? list[0];
  const right = list.find((p) => p.id === b) ?? list[list.length - 1];

  if (photos.length === 0) return <Empty>No progress photos yet.</Empty>;

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto" role="group" aria-label="Pose">
        {posesWith.map((p) => (
          <button
            key={p}
            onClick={() => {
              setPose(p);
              setA("");
              setB("");
            }}
            aria-pressed={pose === p}
            className={cx("min-h-10 rounded-lg px-4 text-sm font-semibold capitalize", pose === p ? "bg-gold text-ink" : "bg-char-2 text-mute")}
          >
            {p.toLowerCase()}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { cur: left, set: setA, label: "Before" },
          { cur: right, set: setB, label: "After" },
        ].map(({ cur, set, label }) => (
          <div key={label}>
            <select className="field mb-2 !py-2 text-sm" value={cur?.id} onChange={(e) => set(e.target.value)} aria-label={`${label} photo date`}>
              {list.map((p) => (
                <option key={p.id} value={p.id}>
                  {short(p.day)}
                </option>
              ))}
            </select>
            {cur && (
              <figure className="overflow-hidden rounded-xl bg-char-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/photos/${cur.id}`} alt={`${pose.toLowerCase()} photo, ${short(cur.day)}`} className="aspect-[3/4] w-full object-cover" />
                <figcaption className="px-2 py-1.5 text-xs text-mute">
                  {label} · {short(cur.day)}
                </figcaption>
              </figure>
            )}
          </div>
        ))}
      </div>

      <details className="rounded-xl border border-line/70">
        <summary className="cursor-pointer p-3 text-sm font-semibold">All photos ({photos.length})</summary>
        <ul className="grid grid-cols-3 gap-2 p-3">
          {[...photos].sort((x, y) => y.day.localeCompare(x.day)).map((p) => (
            <li key={p.id} className="text-xs text-mute">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/photos/${p.id}`} alt={`${p.pose.toLowerCase()} photo, ${short(p.day)}`} loading="lazy" className="aspect-[3/4] w-full rounded-lg object-cover" />
              <div className="mt-1 flex items-center justify-between gap-1">
                <span>
                  {short(p.day)} · {p.pose.toLowerCase()}
                </span>
                {deleteAction && (
                  <form
                    action={deleteAction}
                    onSubmit={(e) => {
                      if (!confirm("Delete this photo? This can't be undone.")) e.preventDefault();
                    }}
                  >
                    <input type="hidden" name="id" value={p.id} />
                    <button className="min-h-8 px-1 text-warn" aria-label="Delete photo">
                      Delete
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

export type MeasurementItem = {
  id: string;
  day: string;
  chestCm: number | null;
  waistCm: number | null;
  hipsCm: number | null;
  armCm: number | null;
  thighCm: number | null;
  neckCm: number | null;
};
const SITES: [keyof MeasurementItem, string][] = [
  ["chestCm", "Chest"],
  ["waistCm", "Waist"],
  ["hipsCm", "Hips"],
  ["armCm", "Arm"],
  ["thighCm", "Thigh"],
  ["neckCm", "Neck"],
];

export function MeasurementCompare({ items }: { items: MeasurementItem[] }) {
  const sorted = [...items].sort((a, b) => a.day.localeCompare(b.day));
  const [a, setA] = useState(sorted[0]?.id ?? "");
  const [b, setB] = useState(sorted[sorted.length - 1]?.id ?? "");
  if (sorted.length === 0) return <Empty>No measurements yet.</Empty>;
  const A = sorted.find((m) => m.id === a) ?? sorted[0];
  const B = sorted.find((m) => m.id === b) ?? sorted[sorted.length - 1];
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { v: A.id, set: setA, label: "From" },
          { v: B.id, set: setB, label: "To" },
        ].map(({ v, set, label }) => (
          <label key={label} className="block">
            <span className="label">{label}</span>
            <select className="field !py-2 text-sm" value={v} onChange={(e) => set(e.target.value)}>
              {sorted.map((m) => (
                <option key={m.id} value={m.id}>
                  {short(m.day)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-faint">
            <th className="py-2 font-medium">Site</th>
            <th className="py-2 text-right font-medium">{short(A.day).slice(0, -5)}</th>
            <th className="py-2 text-right font-medium">{short(B.day).slice(0, -5)}</th>
            <th className="py-2 text-right font-medium">Change</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">
          {SITES.map(([k, label]) => {
            const x = A[k] as number | null;
            const y = B[k] as number | null;
            const d = x !== null && y !== null ? Math.round((y - x) * 10) / 10 : null;
            return (
              <tr key={k}>
                <td className="py-2.5">{label}</td>
                <td className="tabular py-2.5 text-right">{x ?? "–"}</td>
                <td className="tabular py-2.5 text-right">{y ?? "–"}</td>
                <td className={cx("tabular py-2.5 text-right font-semibold", d !== null && d !== 0 && "text-gold")}>
                  {d === null ? "–" : `${d > 0 ? "+" : ""}${d} cm`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
