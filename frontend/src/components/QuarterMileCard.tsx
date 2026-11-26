import { useMemo, useState } from "react";
import type { AutomaticSetup } from "../automatic";
import type { PowerBasis, PowerCurve } from "../power";
import { runQuarterMile, type QuarterMileRun, type RunResult, type VehicleSetup } from "../quarterMile";
import { BIAS_PLY_ROLLING, RADIAL_ROLLING } from "../tires";
import type { Gear } from "./GearChart";
import { LineChart, type Series } from "./LineChart";
import { NumberField } from "./NumberField";
import { Segmented } from "./Segmented";

type VehicleProps = {
  vehicle: VehicleSetup;
  onVehicleChange: (vehicle: VehicleSetup) => void;
};

/** Tire presets set grip and rolling resistance together. */
const TIRE_PRESETS = [
  { id: "street", grip: 0.9, rolling: RADIAL_ROLLING, label: "Street tire (0.9)" },
  { id: "performance", grip: 1.0, rolling: RADIAL_ROLLING, label: "Performance street (1.0)" },
  { id: "radial", grip: 1.3, rolling: RADIAL_ROLLING, label: "Drag radial (1.3)" },
  { id: "slick", grip: 1.6, rolling: BIAS_PLY_ROLLING, label: "Bias-ply slick, prepped track (1.6)" },
];

/** Traction and launch inputs for the Axle & tires section: grip, driven wheels, 60 ft, rollout. */
export function TractionInputs({ vehicle, onVehicleChange }: VehicleProps) {
  const set = (patch: Partial<VehicleSetup>) => onVehicleChange({ ...vehicle, ...patch });
  // Last known 60 ft typed in, kept while the user flips back to the estimate.
  const [lastKnownSixty, setLastKnownSixty] = useState(vehicle.knownSixtyFtS ?? 2.0);
  const tirePreset = TIRE_PRESETS.find((preset) => preset.grip === vehicle.grip && preset.rolling === vehicle.rollingResistance);
  return (
    <>
      <div className="field">
        <label htmlFor="qm-grip">Tire grip</label>
        <select
          id="qm-grip"
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
              Custom ({vehicle.grip} · {vehicle.rollingResistance})
            </option>
          )}
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
      <details className="advanced">
        <summary>Advanced</summary>
        <div className="advanced-grid">
          <NumberField label="Grip coefficient" step={0.05} min={0.2} max={3} value={vehicle.grip} onCommit={(grip) => set({ grip })} />
          <NumberField
            label="Rolling resistance"
            step={0.001}
            min={0.001}
            max={0.1}
            value={vehicle.rollingResistance}
            onCommit={(rollingResistance) => set({ rollingResistance })}
          />
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
        </div>
      </details>
    </>
  );
}

/** Car inputs: race weight, chassis and aero. */
export function CarInputs({ vehicle, onVehicleChange }: VehicleProps) {
  const set = (patch: Partial<VehicleSetup>) => onVehicleChange({ ...vehicle, ...patch });
  return (
    <>
      <NumberField label="Race weight" unit="lb" step={10} min={200} max={20000} value={vehicle.weightLb} onCommit={(weightLb) => set({ weightLb })} />
      <details className="advanced">
        <summary>Advanced</summary>
        <div className="advanced-grid">
          <NumberField label="CG height" unit="in" step={0.5} min={5} max={60} value={vehicle.cgHeightIn} onCommit={(cgHeightIn) => set({ cgHeightIn })} />
          <NumberField label="Wheelbase" unit="in" step={0.5} min={60} max={200} value={vehicle.wheelbaseIn} onCommit={(wheelbaseIn) => set({ wheelbaseIn })} />
          <NumberField label="Drag coefficient" step={0.01} min={0.1} max={1.5} value={vehicle.dragCoefficient} onCommit={(dragCoefficient) => set({ dragCoefficient })} />
          <NumberField label="Frontal area" unit="ft²" step={0.5} min={5} max={80} value={vehicle.frontalAreaFt2} onCommit={(frontalAreaFt2) => set({ frontalAreaFt2 })} />
        </div>
      </details>
    </>
  );
}

/** Manual transmission inputs: shift time, clutch release and drivetrain loss. */
export function ManualInputs({ vehicle, onVehicleChange, curveBasis }: VehicleProps & { curveBasis: PowerBasis }) {
  const set = (patch: Partial<VehicleSetup>) => onVehicleChange({ ...vehicle, ...patch });
  return (
    <div className="field-row">
      <NumberField label="Shift time" unit="s" step={0.05} min={0} max={2} value={vehicle.shiftTimeS} onCommit={(shiftTimeS) => set({ shiftTimeS })} />
      <NumberField
        label="Clutch release"
        unit="s"
        step={0.05}
        min={0}
        max={2}
        value={vehicle.clutchReleaseS}
        onCommit={(clutchReleaseS) => set({ clutchReleaseS })}
      />
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
  );
}

type Props = {
  vehicle: VehicleSetup;
  curve: PowerCurve | null;
  curveBasis: PowerBasis;
  /** Selected automatic's settings (its shift time, loss and launch replace the manual ones), or null. */
  automatic: AutomaticSetup | null;
  gears: Gear[];
  axleRatio: number;
  tireDiameterIn: number;
  shiftRpm: number;
};

/** Quarter-mile results for the current setup. All inputs live in the sidebar. */
export function QuarterMileCard({ vehicle, curve, curveBasis, automatic, gears, axleRatio, tireDiameterIn, shiftRpm }: Props) {
  const run = useMemo<QuarterMileRun | null>(
    () =>
      curve
        ? runQuarterMile({
            ...vehicle,
            curve,
            curveBasis,
            automatic: automatic ?? undefined,
            gearRatios: gears.map((g) => g.ratio),
            axleRatio,
            tireDiameterIn,
            shiftRpm,
          })
        : null,
    [vehicle, curve, curveBasis, automatic, gears, axleRatio, tireDiameterIn, shiftRpm],
  );

  return (
    <section className="card">
      <header className="card-header">
        <div>
          <h2>Quarter-mile simulation</h2>
        </div>
      </header>
      <div className="split-results">{run ? <RunResults run={run} gears={gears} /> : <p className="empty">No power curve.</p>}</div>
    </section>
  );
}

function RunResults({ run, gears }: { run: QuarterMileRun; gears: Gear[] }) {
  const [table, setTable] = useState<"timeslip" | "shifts">("timeslip");
  const split = (label: string) => run.splits.find((s) => s.label === label);
  const sixty = split("60 ft");
  const markers = [
    ...run.shifts.map((shift) => ({ x: shift.t, label: `→${gears[shift.toGear]?.label ?? ""}` })),
    ...(run.eighth ? [{ x: run.eighth.et, label: "1/8", kind: "distance" as const }] : []),
    ...(run.et ? [{ x: run.et, label: "1/4", kind: "distance" as const }] : []),
  ];

  // One series per gear so the trace takes each gear's color.
  const perGear = (value: (s: RunResult["samples"][number]) => number): Series[] =>
    gears.flatMap((gear, index) => {
      const points = run.samples.filter((s) => s.gear === index).map((s) => ({ x: s.t, y: value(s), ft: s.ft }));
      return points.length ? [{ key: gear.label, label: gear.label, color: gear.color, points }] : [];
    });
  const formatT = (t: number) => (t % 1 === 0 ? String(t) : t.toFixed(1));
  // Gear and rpm as the car crosses a mark (first sample at or past it), for the tile hovers.
  const atMark = (ft: number) => {
    // Samples are taken every few ms, so none may land past the finish line: use the last one then.
    const last = run.samples[run.samples.length - 1];
    const sample = run.samples.find((s) => s.ft >= ft) ?? (last && last.ft >= ft - 20 ? last : undefined);
    return sample ? `${gears[sample.gear]?.label ?? ""} · ${Math.round(sample.rpm).toLocaleString()} rpm` : null;
  };
  const quarterReading = run.et ? atMark(1320) : null;
  const eighthReading = run.eighth ? atMark(660) : null;

  return (
    <>
      <div className="run-tiles">
        <div className="stat stat-hero stat-hover" tabIndex={quarterReading ? 0 : undefined}>
          {quarterReading ? <p className="stat-pop">{quarterReading}</p> : null}
          <p className="stat-label">1/4 mile</p>
          <p className="stat-value">
            {run.et ? run.et.toFixed(2) : "—"}
            <span>s</span>
            {run.trapMph ? (
              <span className="stat-trap" title="Average speed over the last 66 ft, like a timing-slip trap speed">
                <span className="stat-at">@</span>
                {run.trapMph.toFixed(1)}
                <span>mph</span>
              </span>
            ) : null}
          </p>
          {run.trapMph ? null : <p className="stat-note">Did not finish</p>}
        </div>
        <div className="stat">
          <p className="stat-label">60 ft · {run.sixtyFtSource === "known" ? "known" : run.sixtyFtSource === "estimate" ? "est." : "best"}</p>
          <p className="stat-value">
            {sixty ? sixty.t.toFixed(2) : "—"}
            <span>s</span>
          </p>
          <p className="stat-note">Launch {run.launchRpm.toLocaleString()} rpm</p>
        </div>
        <div className="stat stat-hover" tabIndex={eighthReading ? 0 : undefined}>
          {eighthReading ? <p className="stat-pop">{eighthReading}</p> : null}
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
        formatReading={(gear, p) => `${p.x.toFixed(1)}s ${gear.label} ${Math.round(p.y)}mph ${Math.round(p.ft ?? 0)}ft`}
        markers={markers}
        xLabel="s"
        yLabel="mph"
        formatX={formatT}
        formatY={(v) => String(Math.round(v))}
      />
      <LineChart
        title="Engine RPM"
        series={perGear((s) => s.rpm)}
        formatReading={(gear, p) => `${p.x.toFixed(1)}s ${gear.label} ${Math.round(p.y).toLocaleString()}rpm ${Math.round(p.ft ?? 0)}ft`}
        markers={markers}
        xLabel="s"
        yLabel="rpm"
        formatX={formatT}
        formatY={(v) => (v >= 1000 ? `${(v / 1000).toFixed(v % 1000 ? 1 : 0)}k` : String(Math.round(v)))}
      />

      <div className="pane">
        <div className="pane-header">
          <Segmented
            label="Run table"
            size="small"
            value={table}
            onChange={setTable}
            options={[
              { value: "timeslip", label: "Timeslip" },
              { value: "shifts", label: "Shifts" },
            ]}
          />
        </div>
        <div className="table-scroll">
          {table === "timeslip" ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Mark</th>
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
              </tbody>
            </table>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Shift</th>
                  <th scope="col" className="num">
                    Time
                  </th>
                  <th scope="col" className="num">
                    Speed
                  </th>
                </tr>
              </thead>
              <tbody>
                {run.shifts.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="muted">
                      No shifts
                    </td>
                  </tr>
                ) : (
                  run.shifts.map((shift) => (
                    <tr key={`shift-${shift.toGear}`}>
                      <th scope="row">
                        {gears[shift.toGear - 1]?.label} → {gears[shift.toGear]?.label}
                      </th>
                      <td className="num strong">{shift.t.toFixed(2)} s</td>
                      <td className="num">{shift.mph.toFixed(1)} mph</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
