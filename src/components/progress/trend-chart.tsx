"use client";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { DayPoint } from "@/lib/metrics";
import { onTarget } from "@/lib/metrics";
import { cx } from "@/components/ui";

type Metric = "weight" | "calories" | "macros" | "steps";
type Macro = "proteinG" | "carbsG" | "fatG";
type Range = 7 | 30 | 90;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const short = (d: string) => `${Number(d.slice(8))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`;
const long = (d: string) => `${WD[new Date(d + "T00:00:00Z").getUTCDay()]} ${short(d)}`;
const n0 = (v: number) => Math.round(v).toLocaleString("en-GB");
const n1 = (v: number) => v.toLocaleString("en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const GOLD = "#d4af37";
const OFF = "#7a6f5e";

type Series = {
  key: keyof DayPoint;
  unit: string;
  label: string;
  value: (p: DayPoint) => number | null;
  target: (p: DayPoint) => number | null;
  hit?: (v: number, t: number) => boolean;
  kind: "bar" | "line";
  fmt: (v: number) => string;
};

const MACRO_LABEL: Record<Macro, string> = { proteinG: "Protein", carbsG: "Carbs", fatG: "Fat" };

function seriesFor(metric: Metric, macro: Macro): Series {
  switch (metric) {
    case "weight":
      return { key: "weightKg", unit: "kg", label: "Body weight", value: (p) => p.weightKg, target: () => null, kind: "line", fmt: n1 };
    case "calories":
      return {
        key: "calories",
        unit: "kcal",
        label: "Calories",
        value: (p) => p.calories,
        target: (p) => p.target?.calories ?? null,
        hit: onTarget.calories,
        kind: "bar",
        fmt: n0,
      };
    case "steps":
      return {
        key: "steps",
        unit: "steps",
        label: "Steps",
        value: (p) => p.steps,
        target: (p) => p.target?.stepGoal ?? null,
        hit: onTarget.steps,
        kind: "bar",
        fmt: n0,
      };
    case "macros":
      return {
        key: macro,
        unit: "g",
        label: MACRO_LABEL[macro],
        value: (p) => p[macro],
        target: (p) => p.target?.[macro] ?? null,
        hit: onTarget[macro],
        kind: "bar",
        fmt: n0,
      };
  }
}

function niceTicks(min: number, max: number, count = 4) {
  const span = max - min || 1;
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return { lo, hi, ticks };
}

export function TrendChart({ points, initialMetric = "calories" }: { points: DayPoint[]; initialMetric?: Metric }) {
  const [metric, setMetric] = useState<Metric>(initialMetric);
  const [macro, setMacro] = useState<Macro>("proteinG");
  const [range, setRange] = useState<Range>(30);
  const [sel, setSel] = useState<number | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(360);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(260, Math.floor(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => setSel(null), [metric, macro, range]);

  const s = seriesFor(metric, macro);
  const data = useMemo(() => points.slice(-range), [points, range]);
  const vals = data.map(s.value);
  const targets = data.map(s.target);
  const logged = vals.filter((v): v is number => v !== null);

  // ----- summary numbers -----
  const avg = logged.length ? logged.reduce((a, b) => a + b, 0) / logged.length : null;
  const hits = s.hit ? data.filter((_, i) => vals[i] !== null && targets[i] !== null && s.hit!(vals[i]!, targets[i]!)).length : 0;
  const withTarget = data.filter((_, i) => vals[i] !== null && targets[i] !== null).length;
  const max = logged.length ? Math.max(...logged) : null;
  const firstW = logged[0] ?? null;
  const lastW = logged[logged.length - 1] ?? null;
  const currentTarget = [...targets].reverse().find((t) => t !== null) ?? null;

  // ----- geometry -----
  const H = 230;
  const padT = 24;
  const padB = 28;
  const padL = 6;
  const padR = 46;
  const plotW = width - padL - padR;
  const plotH = H - padT - padB;
  const step = plotW / data.length;
  const tVals = targets.filter((t): t is number => t !== null);
  let yMin: number, yMax: number;
  if (s.kind === "line") {
    const lo = logged.length ? Math.min(...logged) : 70;
    const hi = logged.length ? Math.max(...logged) : 80;
    yMin = lo - Math.max(0.5, (hi - lo) * 0.25);
    yMax = hi + Math.max(0.5, (hi - lo) * 0.25);
  } else {
    yMin = 0;
    yMax = Math.max(1, ...logged, ...tVals) * 1.08;
  }
  const { lo, hi, ticks } = niceTicks(yMin, yMax);
  const y = (v: number) => padT + plotH - ((v - lo) / (hi - lo)) * plotH;
  const xMid = (i: number) => padL + step * i + step / 2;
  const barW = Math.max(1.5, Math.min(22, step * (range === 90 ? 0.6 : 0.66)));

  // Target as a step line that follows target changes over time.
  let targetPath = "";
  targets.forEach((t, i) => {
    if (t === null) return;
    const x0 = padL + step * i;
    const x1 = x0 + step;
    const prev = i > 0 ? targets[i - 1] : null;
    targetPath += prev === t ? ` L${x1},${y(t)}` : ` M${x0},${y(t)} L${x1},${y(t)}`;
  });

  // Weight: connect consecutive logged days only, so gaps stay visible.
  let linePath = "";
  if (s.kind === "line") {
    vals.forEach((v, i) => {
      if (v === null) return;
      linePath += `${i > 0 && vals[i - 1] !== null ? "L" : "M"}${xMid(i)},${y(v)} `;
    });
  }

  const pick = (e: PointerEvent<SVGRectElement>) => {
    const r = (e.currentTarget as SVGRectElement).getBoundingClientRect();
    const i = Math.floor(((e.clientX - r.left) / r.width) * data.length);
    setSel(Math.min(data.length - 1, Math.max(0, i)));
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") setSel((v) => Math.max(0, (v ?? data.length) - 1));
    else if (e.key === "ArrowRight") setSel((v) => Math.min(data.length - 1, (v ?? -1) + 1));
    else if (e.key === "Escape") setSel(null);
    else return;
    e.preventDefault();
  };

  const selP = sel !== null ? data[sel] : null;
  const labelIdx = range === 7 ? data.map((_, i) => i) : [0, Math.floor((data.length - 1) / 2), data.length - 1];

  return (
    <div>
      {/* Metric switcher */}
      <div role="tablist" aria-label="Chart metric" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {(["weight", "calories", "macros", "steps"] as Metric[]).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={metric === m}
            onClick={() => setMetric(m)}
            className={cx(
              "min-h-11 shrink-0 rounded-xl px-4 text-sm font-semibold capitalize",
              metric === m ? "bg-gold text-ink" : "bg-char-2 text-mute",
            )}
          >
            {m}
          </button>
        ))}
      </div>
      {metric === "macros" && (
        <div className="mt-2 flex gap-1" role="group" aria-label="Macro">
          {(Object.keys(MACRO_LABEL) as Macro[]).map((m) => (
            <button
              key={m}
              onClick={() => setMacro(m)}
              aria-pressed={macro === m}
              className={cx(
                "min-h-10 rounded-lg border px-3 text-sm",
                macro === m ? "border-gold text-gold" : "border-line text-mute",
              )}
            >
              {MACRO_LABEL[m]}
            </button>
          ))}
        </div>
      )}

      {/* Headline numbers */}
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <div className="text-sm text-mute">{s.label}</div>
          {s.kind === "line" ? (
            <>
              <div className="font-display tabular text-5xl leading-none">
                {lastW !== null ? n1(lastW) : "–"}
                <span className="ml-1 text-lg text-mute">kg</span>
              </div>
              <div className="mt-1 text-sm text-mute">
                {firstW !== null && lastW !== null && logged.length > 1
                  ? `${lastW - firstW > 0 ? "+" : ""}${n1(lastW - firstW)} kg over ${range} days · ${logged.length} weigh-ins`
                  : "Latest weigh-in"}
              </div>
            </>
          ) : (
            <>
              <div className="font-display tabular text-5xl leading-none">
                {avg !== null ? s.fmt(avg) : "–"}
                <span className="ml-1 text-lg text-mute">{s.unit}</span>
              </div>
              <div className="mt-1 text-sm text-mute">
                Daily average
                {withTarget > 0 && (
                  <>
                    {" · "}
                    <span className="text-gold">
                      On target {hits} of {withTarget}
                    </span>{" "}
                    logged days
                  </>
                )}
              </div>
            </>
          )}
        </div>
        <div className="flex shrink-0 rounded-xl bg-char-2 p-1" role="group" aria-label="Time range">
          {([7, 30, 90] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              aria-pressed={range === r}
              className={cx("min-h-10 min-w-11 rounded-lg px-2 text-sm font-semibold", range === r ? "bg-gold text-ink" : "text-mute")}
            >
              {r}D
            </button>
          ))}
        </div>
      </div>

      {/* Day readout */}
      <div className="mt-3 min-h-[68px] rounded-xl border border-line/70 bg-char-2 px-3 py-2" aria-live="polite">
        {selP ? (
          <DayReadout p={selP} s={s} />
        ) : (
          <div className="flex h-full min-h-[52px] items-center justify-between gap-3 text-sm text-mute">
            <span>Tap or drag across the chart to see a day.</span>
            {s.kind === "bar" && max !== null && (
              <span className="shrink-0 text-right">
                <span className="font-display tabular text-lg text-bone">{s.fmt(max)}</span> highest
              </span>
            )}
          </div>
        )}
      </div>

      {/* Chart */}
      <div ref={wrap} className="relative mt-3 select-none">
        <svg
          width={width}
          height={H}
          role="img"
          aria-label={`${s.label}, last ${range} days. ${logged.length} days logged.`}
          tabIndex={0}
          onKeyDown={onKey}
          className="block touch-pan-y outline-none"
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={padL + plotW} y1={y(t)} y2={y(t)} stroke="#2e2e2e" strokeWidth={1} />
              <text x={width - 4} y={y(t) + 4} textAnchor="end" fontSize={11} fill="#8a8a8a" className="tabular">
                {s.kind === "line" ? n1(t) : t >= 10000 ? `${Math.round(t / 1000)}k` : n0(t)}
              </text>
            </g>
          ))}

          {sel !== null && (
            <rect x={padL + step * sel} y={padT} width={step} height={plotH} fill="#ffffff" opacity={0.05} />
          )}

          {s.kind === "bar" &&
            vals.map((v, i) => {
              if (v === null) return null;
              const t = targets[i];
              const good = s.hit && t !== null ? s.hit(v, t) : true;
              const top = y(v);
              const h = Math.max(1, y(lo) - top);
              return (
                <rect
                  key={data[i].day}
                  x={xMid(i) - barW / 2}
                  y={top}
                  width={barW}
                  height={h}
                  rx={Math.min(barW / 2, 6)}
                  fill={good ? GOLD : OFF}
                  opacity={sel === null || sel === i ? 1 : 0.55}
                />
              );
            })}

          {s.kind === "line" && (
            <>
              <path d={linePath} fill="none" stroke={GOLD} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
              {vals.map((v, i) =>
                v === null ? null : (
                  <circle
                    key={data[i].day}
                    cx={xMid(i)}
                    cy={y(v)}
                    r={sel === i ? 6 : range === 90 ? 2.5 : 3.5}
                    fill={sel === i ? "#0a0a0a" : GOLD}
                    stroke={GOLD}
                    strokeWidth={2}
                  />
                ),
              )}
            </>
          )}

          {targetPath && (
            <>
              <path d={targetPath} fill="none" stroke="#f4efe4" strokeOpacity={0.8} strokeWidth={1.5} strokeDasharray="4 4" />
              {currentTarget !== null && (
                <text x={padL + 2} y={13} fontSize={11} fill="#f4efe4" fontWeight={600}>
                  Target {s.fmt(currentTarget)} {s.unit === "steps" ? "" : s.unit}
                </text>
              )}
            </>
          )}

          {labelIdx.map((i) => (
            <text
              key={i}
              x={range === 7 ? xMid(i) : i === 0 ? padL : i === data.length - 1 ? padL + plotW : xMid(i)}
              y={H - 8}
              fontSize={11}
              fill="#8a8a8a"
              textAnchor={range === 7 ? "middle" : i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
            >
              {range === 7 ? WD[new Date(data[i].day + "T00:00:00Z").getUTCDay()] : short(data[i].day)}
            </text>
          ))}

          {/* Touch/pointer layer */}
          <rect
            x={padL}
            y={0}
            width={plotW}
            height={H}
            fill="transparent"
            onPointerDown={(e) => {
              (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
              pick(e);
            }}
            onPointerMove={(e) => {
              if (e.buttons > 0 || e.pointerType === "mouse") pick(e);
            }}
            style={{ cursor: "crosshair" }}
          />
        </svg>
      </div>

      {s.kind === "bar" && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-mute">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: GOLD }} /> On target
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: OFF }} /> Off target
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 border-t border-dashed border-bone" /> Coach target
          </span>
          <span>Blank = not logged</span>
        </div>
      )}
    </div>
  );
}

function DayReadout({ p, s }: { p: DayPoint; s: Series }) {
  const v = s.value(p);
  const t = s.target(p);
  const cell = (label: string, value: number | null, unit: string, digits = 0) => (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-faint">{label}</div>
      <div className="tabular text-sm font-semibold">
        {value === null ? <span className="text-faint">–</span> : `${digits ? n1(value) : n0(value)}${unit}`}
      </div>
    </div>
  );
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-sm font-semibold">{long(p.day)}</div>
        <div className="text-right">
          {v === null ? (
            <span className="text-sm text-faint">Not logged</span>
          ) : (
            <span className="font-display tabular text-2xl">
              {s.fmt(v)}
              <span className="ml-1 text-sm text-mute">{s.unit}</span>
            </span>
          )}
          {t !== null && <span className="ml-2 text-xs text-mute">/ {s.fmt(t)} target</span>}
        </div>
      </div>
      <div className="mt-1 grid grid-cols-6 gap-1">
        {cell("Weight", p.weightKg, "", 1)}
        {cell("Kcal", p.calories, "")}
        {cell("Prot", p.proteinG, "g")}
        {cell("Carb", p.carbsG, "g")}
        {cell("Fat", p.fatG, "g")}
        {cell("Steps", p.steps, "")}
      </div>
      {p.workouts > 0 && <div className="mt-1 text-xs text-gold">✓ Workout completed</div>}
    </div>
  );
}
