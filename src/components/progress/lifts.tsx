"use client";
import { useMemo, useState } from "react";
import type { LiftHistory } from "@/lib/progress";
import { Empty, cx } from "@/components/ui";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const short = (d: string) => `${Number(d.slice(8))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`;
const kg = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

export function Lifts({ lifts }: { lifts: LiftHistory[] }) {
  const [key, setKey] = useState(lifts[0]?.key ?? "");
  const [metric, setMetric] = useState<"top" | "e1rm">("top");
  const lift = lifts.find((l) => l.key === key) ?? lifts[0];
  const sessions = lift?.sessions ?? [];
  const vals = useMemo(() => sessions.map((s) => (metric === "top" ? s.top.weightKg : s.best1rm)), [sessions, metric]);

  if (!lift) return <Empty>No lifts logged yet. Log a workout and your history will appear here.</Empty>;

  const first = sessions[0];
  const last = sessions[sessions.length - 1];
  const W = 340, H = 150, pad = 16;
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const span = hi - lo || 1;
  const x = (i: number) => (sessions.length === 1 ? W / 2 : pad + (i / (sessions.length - 1)) * (W - pad * 2));
  const y = (v: number) => pad + (H - pad * 2) * (1 - (v - lo) / span);

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="label">Exercise</span>
        <select className="field" value={lift.key} onChange={(e) => setKey(e.target.value)}>
          {lifts.map((l) => (
            <option key={l.key} value={l.key}>
              {l.name} ({l.sessions.length})
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="First" value={`${kg(first.top.weightKg)}kg × ${first.top.reps}`} sub={short(first.day)} />
        <Stat label="Latest" value={`${kg(last.top.weightKg)}kg × ${last.top.reps}`} sub={short(last.day)} />
        <Stat
          label="Change"
          value={`${last.top.weightKg - first.top.weightKg >= 0 ? "+" : ""}${kg(last.top.weightKg - first.top.weightKg)}kg`}
          sub={`${sessions.length} sessions`}
          gold
        />
      </div>

      {sessions.length > 1 && (
        <div className="rounded-xl bg-char-2 p-3">
          <div className="mb-2 flex gap-1">
            {(["top", "e1rm"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                aria-pressed={metric === m}
                className={cx("min-h-9 rounded-lg px-3 text-xs font-semibold", metric === m ? "bg-gold text-ink" : "text-mute")}
              >
                {m === "top" ? "Top set (kg)" : "Est. 1RM (kg)"}
              </button>
            ))}
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${lift.name} progress chart`}>
            <path
              d={vals.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ")}
              fill="none"
              stroke="#d4af37"
              strokeWidth={2.5}
              strokeLinejoin="round"
            />
            {vals.map((v, i) => (
              <circle key={i} cx={x(i)} cy={y(v)} r={3.5} fill="#d4af37" />
            ))}
            <text x={pad} y={H - 2} fontSize={10} fill="#8a8a8a">{short(first.day)}</text>
            <text x={W - pad} y={H - 2} fontSize={10} fill="#8a8a8a" textAnchor="end">{short(last.day)}</text>
            <text x={W - pad} y={y(hi) - 6} fontSize={10} fill="#f4efe4" textAnchor="end">{kg(hi)}</text>
          </svg>
        </div>
      )}

      <ul className="divide-y divide-line/60 rounded-xl border border-line/70">
        {[...sessions].reverse().map((s) => (
          <li key={s.day} className="flex items-start justify-between gap-3 p-3">
            <div className="text-sm font-semibold">{short(s.day)}</div>
            <div className="text-right text-sm">
              <div className="tabular text-bone">{s.sets.map((x) => `${kg(x.weightKg)}×${x.reps}`).join("  ·  ")}</div>
              <div className="text-xs text-faint">Volume {s.volume.toLocaleString("en-GB")} kg · e1RM {kg(s.best1rm)} kg</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value, sub, gold }: { label: string; value: string; sub: string; gold?: boolean }) {
  return (
    <div className="rounded-xl bg-char-2 p-3">
      <div className="text-[11px] uppercase tracking-wide text-faint">{label}</div>
      <div className={cx("font-display tabular text-lg leading-tight", gold && "text-gold")}>{value}</div>
      <div className="text-xs text-mute">{sub}</div>
    </div>
  );
}
