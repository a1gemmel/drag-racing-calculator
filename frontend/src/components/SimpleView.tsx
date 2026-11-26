import { useMemo, useState } from "react";
import { simpleWheelHp, simulateSimplePass, SIMPLE_DRIVELINE_LOSS, type SimpleSetup } from "../simplePass";
import type { Sample } from "../quarterMile";
import { LineChart, type ChartDot } from "./LineChart";
import { NumberField } from "./NumberField";
import { COMPLETION_TICKS, DISTANCE_TICKS, TIRE_PRESETS, TimeslipStrip } from "./QuarterMileCard";
import { Segmented } from "./Segmented";

const TRACE_COLOR = "#3987e5";
type Axis = "time" | "distance" | "completion";

/** Simple mode: one car from hp, weight and tires (plus an optional 60 ft), and its simulated pass. */
export function SimpleView({ setup, onChange }: { setup: SimpleSetup; onChange: (setup: SimpleSetup) => void }) {
  const set = (patch: Partial<SimpleSetup>) => onChange({ ...setup, ...patch });
  const run = useMemo(() => simulateSimplePass(setup), [setup]);
  const [lastKnownSixty, setLastKnownSixty] = useState(setup.knownSixtyFtS ?? 2.0);
  const [axis, setAxis] = useState<Axis>("time");
  const tirePreset = TIRE_PRESETS.find((preset) => preset.grip === setup.grip && preset.rolling === setup.rollingResistance);
  const sixty = run.splits.find((s) => s.label === "60 ft");

  const completion = axis === "completion";
  const value = (s: Sample) => (completion ? s.ft : s.mph);
  const points = run.samples.map((s) => ({ x: axis === "distance" ? s.ft : s.t, y: value(s), ft: s.ft, t: s.t }));
  const marks = [
    { label: "1/8", ft: 660, et: run.eighth?.et, mph: run.eighth?.mph, speedAt: run.splits.find((s) => s.ft === 660)?.mph },
    { label: "1/4", ft: 1320, et: run.et ?? undefined, mph: run.trapMph ?? undefined, speedAt: run.splits.find((s) => s.ft === 1320)?.mph },
  ];
  const dots: ChartDot[] = marks.flatMap((mark) =>
    mark.et === undefined || mark.mph === undefined || mark.speedAt === undefined
      ? []
      : [
          {
            key: mark.label,
            x: axis === "distance" ? mark.ft : mark.et,
            y: completion ? mark.ft : mark.speedAt,
            color: TRACE_COLOR,
            label: `${mark.label}: ${mark.et.toFixed(3)} s @ ${mark.mph.toFixed(1)} mph`,
          },
        ],
  );
  const formatFt = (ft: number) => (ft >= 1000 ? ft.toLocaleString() : String(Math.round(ft)));
  const formatT = (t: number) => (t % 1 === 0 ? String(t) : t.toFixed(1));

  return (
    <>
      <section className="card">
        <header className="card-header">
          <div>
            <h2>Car</h2>
            <p className="card-subtitle">
              {Math.round(simpleWheelHp(setup.hp))} whp · {Math.round(SIMPLE_DRIVELINE_LOSS * 100)}% driveline loss
            </p>
          </div>
        </header>
        <div className="input-grid">
          <NumberField label="Horsepower (crank)" unit="hp" step={1} min={1} max={5000} value={setup.hp} onCommit={(hp) => set({ hp })} />
          <NumberField label="Race weight" unit="lb" step={10} min={200} max={20000} value={setup.weightLb} onCommit={(weightLb) => set({ weightLb })} />
          <div className="field">
            <label htmlFor="simple-tires">Tires</label>
            <select
              id="simple-tires"
              value={tirePreset ? tirePreset.id : "custom"}
              onChange={(event) => {
                const preset = TIRE_PRESETS.find((p) => p.id === event.target.value);
                if (preset) set({ grip: preset.grip, rollingResistance: preset.rolling });
              }}
            >
              {TIRE_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
              {tirePreset ? null : (
                <option value="custom">
                  Custom ({setup.grip} · {setup.rollingResistance})
                </option>
              )}
            </select>
          </div>
          <div className="field">
            <span className="field-label">60 ft</span>
            <Segmented<"best" | "known">
              label="60 ft"
              size="small"
              value={setup.knownSixtyFtS === null ? "best" : "known"}
              onChange={(mode) => set({ knownSixtyFtS: mode === "known" ? lastKnownSixty : null })}
              options={[
                { value: "best", label: "Estimate" },
                { value: "known", label: "Known" },
              ]}
            />
          </div>
          {setup.knownSixtyFtS !== null ? (
            <NumberField
              label="Known 60 ft"
              unit="s"
              step={0.01}
              min={0.8}
              max={6}
              value={setup.knownSixtyFtS}
              onCommit={(knownSixtyFtS) => {
                setLastKnownSixty(knownSixtyFtS);
                set({ knownSixtyFtS });
              }}
            />
          ) : null}
        </div>
      </section>

      <section className="card">
        <header className="card-header">
          <div>
            <h2>Quarter mile</h2>
          </div>
        </header>
        <div className="run-tiles simple-tiles">
          <div className="stat stat-hero">
            <p className="stat-label">1/4 mile</p>
            <p className="stat-value">
              {run.et !== null ? run.et.toFixed(2) : "—"}
              <span>s</span>
              {run.trapMph ? (
                <span className="stat-trap">
                  <span className="stat-at">@</span>
                  {run.trapMph.toFixed(1)}
                  <span>mph</span>
                </span>
              ) : null}
            </p>
            {run.trapMph ? null : <p className="stat-note">Did not finish</p>}
          </div>
          <div className="stat">
            <p className="stat-label">60 ft · {run.sixtyFtSource === "known" ? "known" : "est."}</p>
            <p className="stat-value">
              {sixty ? sixty.t.toFixed(2) : "—"}
              <span>s</span>
            </p>
          </div>
          <div className="stat">
            <p className="stat-label">1/8 mile</p>
            <p className="stat-value">
              {run.eighth ? run.eighth.et.toFixed(2) : "—"}
              <span>s</span>
            </p>
            <p className="stat-note">{run.eighth ? `@ ${run.eighth.mph.toFixed(1)} mph` : ""}</p>
          </div>
        </div>
        {run.warnings.length ? (
          <ul className="warnings">
            {run.warnings.map((warning) => (
              <li key={warning}>
                <span aria-hidden="true">!</span> {warning}
              </li>
            ))}
          </ul>
        ) : null}
        <TimeslipStrip run={run} />
        <div className="chart-head">
          <Segmented<Axis>
            label="Chart"
            size="small"
            value={axis}
            onChange={setAxis}
            options={[
              { value: "time", label: "Time" },
              { value: "distance", label: "Distance" },
              { value: "completion", label: "Completion" },
            ]}
          />
        </div>
        <LineChart
          title={completion ? "Completion" : "Speed"}
          series={[{ key: "pass", label: "Speed", color: TRACE_COLOR, points }]}
          dots={dots}
          formatReading={(_s, p) =>
            completion
              ? `${(p.t ?? 0).toFixed(2)}s ${Math.round(p.y)}ft`
              : axis === "distance"
                ? `${Math.round(p.x)}ft ${Math.round(p.y)}mph ${(p.t ?? 0).toFixed(2)}s`
                : `${p.x.toFixed(1)}s ${Math.round(p.y)}mph ${Math.round(p.ft ?? 0)}ft`
          }
          markers={
            axis === "distance"
              ? [
                  { x: 660, label: "1/8", kind: "distance" },
                  { x: 1320, label: "1/4", kind: "distance" },
                ]
              : []
          }
          hMarkers={
            completion
              ? [
                  { y: 660, label: "1/8" },
                  { y: 1320, label: "1/4" },
                ]
              : []
          }
          xLabel={axis === "distance" ? "ft" : "s"}
          xMax={axis === "distance" ? 1320 : undefined}
          xTicks={axis === "distance" ? DISTANCE_TICKS : undefined}
          yTicks={completion ? COMPLETION_TICKS : undefined}
          yLabel={completion ? "ft" : "mph"}
          formatX={axis === "distance" ? formatFt : formatT}
          formatY={completion ? formatFt : (v) => String(Math.round(v))}
          height={240}
        />
      </section>
    </>
  );
}
