import { useMemo, useState } from "react";
import type { PowerBasis, PowerCurve } from "../power";
import { runQuarterMile, type QuarterMileRun, type RunResult, type VehicleSetup } from "../quarterMile";
import type { Gear } from "./GearChart";
import { LineChart, type Series } from "./LineChart";
import { NumberField } from "./NumberField";
import { Segmented } from "./Segmented";

type Props = {
  vehicle: VehicleSetup;
  onVehicleChange: (vehicle: VehicleSetup) => void;
  curve: PowerCurve | null;
  curveBasis: PowerBasis;
  gears: Gear[];
  axleRatio: number;
  tireDiameterIn: number;
  shiftRpm: number;
};

const GRIP_PRESETS = [
  { value: 0.9, label: "Street tire (0.9)" },
  { value: 1.0, label: "Performance street (1.0)" },
  { value: 1.3, label: "Drag radial (1.3)" },
  { value: 1.6, label: "Slick, prepped track (1.6)" },
];

export function QuarterMileCard({ vehicle, onVehicleChange, curve, curveBasis, gears, axleRatio, tireDiameterIn, shiftRpm }: Props) {
  const set = (patch: Partial<VehicleSetup>) => onVehicleChange({ ...vehicle, ...patch });
  // Last known 60 ft typed in, kept while the user flips back to the estimate.
  const [lastKnownSixty, setLastKnownSixty] = useState(vehicle.knownSixtyFtS ?? 2.0);
  const run = useMemo<QuarterMileRun | null>(
    () =>
      curve
        ? runQuarterMile({ ...vehicle, curve, curveBasis, gearRatios: gears.map((g) => g.ratio), axleRatio, tireDiameterIn, shiftRpm })
        : null,
    [vehicle, curve, curveBasis, gears, axleRatio, tireDiameterIn, shiftRpm],
  );

  const gripPreset = GRIP_PRESETS.find((preset) => preset.value === vehicle.grip);

  return (
    <section className="card">
      <header className="card-header">
        <div>
          <h2>Quarter-mile simulation</h2>
        </div>
      </header>

      <div className="split">
        <div className="split-inputs">
          <div className="field-row">
            <NumberField label="Race weight" unit="lb" step={10} min={200} max={20000} value={vehicle.weightLb} onCommit={(weightLb) => set({ weightLb })} />
            <NumberField
              label="Drivetrain loss"
              unit="%"
              step={1}
              min={0}
              max={50}
              value={Math.round(vehicle.drivetrainLoss * 100)}
              disabled={curveBasis === "wheel"}
              onCommit={(loss) => set({ drivetrainLoss: loss / 100 })}
            />
          </div>
          <div className="field">
            <label htmlFor="qm-grip">Tires</label>
            <select
              id="qm-grip"
              value={gripPreset ? String(gripPreset.value) : "custom"}
              onChange={(event) => event.target.value !== "custom" && set({ grip: Number(event.target.value) })}
            >
              {GRIP_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
              {gripPreset ? null : <option value="custom">Custom ({vehicle.grip})</option>}
            </select>
          </div>
          <div className="field">
            <span className="field-label">Driven wheels</span>
            <Segmented
              label="Driven wheels"
              size="small"
              value={vehicle.drive}
              onChange={(drive) => set({ drive })}
              options={[
                { value: "rear", label: "RWD" },
                { value: "front", label: "FWD" },
                { value: "awd", label: "AWD" },
              ]}
            />
          </div>
          <div className="field">
            <span className="field-label">60 ft</span>
            <Segmented
              label="60 ft"
              size="small"
              value={vehicle.knownSixtyFtS === null ? "best" : "known"}
              onChange={(mode) => set({ knownSixtyFtS: mode === "known" ? lastKnownSixty : null })}
              options={[
                { value: "best", label: "Best estimate" },
                { value: "known", label: "Known" },
              ]}
            />
          </div>
          <div className="field-row">
            {vehicle.knownSixtyFtS !== null ? (
              <NumberField
                label="Known 60 ft"
                unit="s"
                step={0.01}
                min={0.8}
                max={6}
                value={vehicle.knownSixtyFtS}
                onCommit={(knownSixtyFtS) => {
                  setLastKnownSixty(knownSixtyFtS);
                  set({ knownSixtyFtS });
                }}
              />
            ) : null}
            <NumberField label="Shift time" unit="s" step={0.05} min={0} max={2} value={vehicle.shiftTimeS} onCommit={(shiftTimeS) => set({ shiftTimeS })} />
          </div>

          <details className="advanced">
            <summary>Advanced</summary>
            <div className="advanced-grid">
              <NumberField label="Grip coefficient" step={0.05} min={0.2} max={3} value={vehicle.grip} onCommit={(grip) => set({ grip })} />
              {vehicle.drive !== "awd" ? (
                <NumberField
                  label="Weight on driven axle"
                  unit="%"
                  step={1}
                  min={10}
                  max={90}
                  value={Math.round(vehicle.driveWeightFraction * 100)}
                  onCommit={(pct) => set({ driveWeightFraction: pct / 100 })}
                />
              ) : null}
              <NumberField label="Rollout" unit="in" step={0.5} min={0} max={24} value={vehicle.rolloutIn} onCommit={(rolloutIn) => set({ rolloutIn })} />
              <NumberField label="CG height" unit="in" step={0.5} min={5} max={60} value={vehicle.cgHeightIn} onCommit={(cgHeightIn) => set({ cgHeightIn })} />
              <NumberField label="Wheelbase" unit="in" step={0.5} min={60} max={200} value={vehicle.wheelbaseIn} onCommit={(wheelbaseIn) => set({ wheelbaseIn })} />
              <NumberField label="Drag coefficient" step={0.01} min={0.1} max={1.5} value={vehicle.dragCoefficient} onCommit={(dragCoefficient) => set({ dragCoefficient })} />
              <NumberField label="Frontal area" unit="ft²" step={0.5} min={5} max={80} value={vehicle.frontalAreaFt2} onCommit={(frontalAreaFt2) => set({ frontalAreaFt2 })} />
              <NumberField
                label="Rolling resistance"
                step={0.001}
                min={0.001}
                max={0.1}
                value={vehicle.rollingResistance}
                onCommit={(rollingResistance) => set({ rollingResistance })}
              />
            </div>
          </details>
        </div>

        <div className="split-results">{run ? <RunResults run={run} gears={gears} /> : <p className="empty">No power curve.</p>}</div>
      </div>
    </section>
  );
}

function RunResults({ run, gears }: { run: QuarterMileRun; gears: Gear[] }) {
  const split = (label: string) => run.splits.find((s) => s.label === label);
  const sixty = split("60 ft");
  const markers = run.shifts.map((shift) => ({ x: shift.t, label: `→${gears[shift.toGear]?.label ?? ""}` }));

  // One series per gear so the trace takes each gear's color.
  const perGear = (value: (s: RunResult["samples"][number]) => number): Series[] =>
    gears.flatMap((gear, index) => {
      const points = run.samples.filter((s) => s.gear === index).map((s) => ({ x: s.t, y: value(s) }));
      return points.length ? [{ key: gear.label, label: gear.label, color: gear.color, points }] : [];
    });
  const formatT = (t: number) => (t % 1 === 0 ? String(t) : t.toFixed(1));

  return (
    <>
      <div className="run-tiles">
        <div className="stat stat-hero">
          <p className="stat-label">1/4 mile</p>
          <p className="stat-value">
            {run.et ? run.et.toFixed(2) : "—"}
            <span>s</span>
          </p>
          <p className="stat-note" title="Average speed over the last 66 ft, like a timing-slip trap speed">
            {run.trapMph ? `@ ${run.trapMph.toFixed(1)} mph trap` : "Did not finish"}
          </p>
        </div>
        <div className="stat">
          <p className="stat-label">60 ft · {run.sixtyFtSource === "known" ? "known" : "best"}</p>
          <p className="stat-value">
            {sixty ? sixty.t.toFixed(2) : "—"}
            <span>s</span>
          </p>
          <p className="stat-note">Launch {run.launchRpm.toLocaleString()} rpm</p>
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

      <LineChart
        title="Speed"
        series={perGear((s) => s.mph)}
        markers={markers}
        xLabel="s"
        yLabel="mph"
        formatX={formatT}
        formatY={(v) => String(Math.round(v))}
      />
      <LineChart
        title="Engine RPM"
        series={perGear((s) => s.rpm)}
        markers={markers}
        xLabel="s"
        yLabel="rpm"
        formatX={formatT}
        formatY={(v) => (v >= 1000 ? `${(v / 1000).toFixed(v % 1000 ? 1 : 0)}k` : String(Math.round(v)))}
      />

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Split</th>
              <th scope="col" className="num">
                Time
              </th>
              <th scope="col" className="num">
                Speed at mark
              </th>
            </tr>
          </thead>
          <tbody>
            {run.splits.map((s) => (
              <tr key={s.label}>
                <th scope="row">{s.label}</th>
                <td className="num strong">{s.t.toFixed(3)} s</td>
                <td className="num">{s.mph.toFixed(1)} mph</td>
              </tr>
            ))}
            {run.shifts.map((shift) => (
              <tr key={`shift-${shift.toGear}`}>
                <th scope="row">Shift to {gears[shift.toGear]?.label}</th>
                <td className="num">{shift.t.toFixed(2)} s</td>
                <td className="num">{shift.mph.toFixed(1)} mph</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
