import { useEffect, useMemo, useRef, useState } from "react";
import type { AutomaticSetup } from "../automatic";
import type { PowerBasis, PowerCurve } from "../power";
import type { TrackConditions } from "../appState";
import {
  airCorrectedCurve,
  marginFt,
  densityFromWeather,
  densityRatioAtAltitude,
  runQuarterMile,
  type QuarterMileRun,
  type RunInput,
  type Sample,
  type VehicleSetup,
} from "../quarterMile";
import { BIAS_PLY_ROLLING, RADIAL_ROLLING } from "../tires";
import type { Gear } from "./GearChart";
import { LineChart, type ChartDot, type ChartPoint, type Series } from "./LineChart";
import { NumberField } from "./NumberField";
import { CarPresets } from "./CarPresets";
import { InfoTip } from "./InfoTip";
import { PassReplay } from "./PassReplay";
import { Segmented } from "./Segmented";

type VehicleProps = {
  vehicle: VehicleSetup;
  onVehicleChange: (vehicle: VehicleSetup) => void;
};

/** Tire presets set grip and rolling resistance together. */
export const TIRE_PRESETS = [
  { id: "street", grip: 0.9, rolling: RADIAL_ROLLING, label: "Street tire (0.9)" },
  { id: "performance", grip: 1.0, rolling: RADIAL_ROLLING, label: "Performance street (1.0)" },
  { id: "radial", grip: 1.3, rolling: RADIAL_ROLLING, label: "Drag radial (1.3)" },
  { id: "slick", grip: 1.6, rolling: BIAS_PLY_ROLLING, label: "Bias-ply slick, prepped track (1.6)" },
];

/** Tire inputs for the Tires card: grip preset; grip coefficient, rolling resistance and rollout under Advanced. */
export function TireInputs({ vehicle, onVehicleChange }: VehicleProps) {
  const set = (patch: Partial<VehicleSetup>) => onVehicleChange({ ...vehicle, ...patch });
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
          <NumberField label="Rollout" unit="in" step={0.5} min={0} max={24} value={vehicle.rolloutIn} onCommit={(rolloutIn) => set({ rolloutIn })} />
        </div>
      </details>
    </>
  );
}

/** Car inputs: race weight, axle ratio, driven wheels, launch and 60 ft; chassis and aero under Advanced. */
export function CarInputs({
  vehicle,
  onVehicleChange,
  axleRatio,
  onAxleRatioChange,
}: VehicleProps & { axleRatio: number; onAxleRatioChange: (ratio: number) => void }) {
  const set = (patch: Partial<VehicleSetup>) => onVehicleChange({ ...vehicle, ...patch });
  // Bumped on each preset pick: remounting the Advanced fields replays their flash, showing what the preset set.
  const [presetFlash, setPresetFlash] = useState(0);
  const advancedRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  // Restart the header flash on the same element: re-keying a <summary> leaves the old one first inside <details>.
  const flashHeader = () => {
    const el = summaryRef.current;
    if (!el) return;
    el.classList.remove("advanced-flash");
    void el.offsetWidth;
    el.classList.add("advanced-flash");
  };
  // Last known 60 ft typed in, kept while the user flips back to the estimate.
  const [lastKnownSixty, setLastKnownSixty] = useState(vehicle.knownSixtyFtS ?? 2.0);
  return (
    <>
      <NumberField label="Race weight" unit="lb" step={10} min={200} max={20000} value={vehicle.weightLb} onCommit={(weightLb) => set({ weightLb })} />
      <NumberField label="Axle ratio" unit=":1" step={0.01} min={0.5} value={axleRatio} onCommit={onAxleRatioChange} />
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
        <span className="field-label">
          Launch control
          <InfoTip label="About launch control">More accurate 60 foot calculation for late-model cars</InfoTip>
        </span>
        <Segmented<"off" | "on">
          label="Launch control"
          size="small"
          value={vehicle.launchControl ? "on" : "off"}
          onChange={(value) => set({ launchControl: value === "on" })}
          options={[
            { value: "off", label: "Off" },
            { value: "on", label: "On" },
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
      <div className="field">
        <span className="field-label">Aero Preset</span>
        <CarPresets
          vehicle={vehicle}
          onApply={(patch) => {
            set(patch);
            // Show what changed: flash the Advanced fields if they're on screen, else the Advanced header.
            if (advancedRef.current?.open) setPresetFlash((n) => n + 1);
            else flashHeader();
          }}
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
      <details className="advanced" ref={advancedRef}>
        <summary ref={summaryRef}>Advanced</summary>
        <div className={presetFlash ? "advanced-grid preset-flash" : "advanced-grid"} key={presetFlash}>
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
          <NumberField label="CG height" unit="in" step={0.5} min={5} max={60} value={vehicle.cgHeightIn} onCommit={(cgHeightIn) => set({ cgHeightIn })} />
          <NumberField label="Wheelbase" unit="in" step={0.5} min={60} max={400} value={vehicle.wheelbaseIn} onCommit={(wheelbaseIn) => set({ wheelbaseIn })} />
          <NumberField label="Drag coefficient" step={0.01} min={0.1} max={1.5} value={vehicle.dragCoefficient} onCommit={(dragCoefficient) => set({ dragCoefficient })} />
          <NumberField label="Frontal area" unit="ft²" step={0.5} min={5} max={80} value={vehicle.frontalAreaFt2} onCommit={(frontalAreaFt2) => set({ frontalAreaFt2 })} />
        </div>
      </details>
    </>
  );
}

/** Manual transmission inputs: shift time, clutch release and drivetrain loss. */
export function ManualInputs({ vehicle, onVehicleChange, curveBasis, dualClutch }: VehicleProps & { curveBasis: PowerBasis; dualClutch?: boolean }) {
  const set = (patch: Partial<VehicleSetup>) => onVehicleChange({ ...vehicle, ...patch });
  return (
    <div className="field-row">
      {/* A dual-clutch box power-shifts in a fixed DCT_SHIFT_TIME_S, so the coasting shift time doesn't apply. */}
      {dualClutch ? null : <NumberField label="Shift time" unit="s" step={0.05} min={0} max={2} value={vehicle.shiftTimeS} onCommit={(shiftTimeS) => set({ shiftTimeS })} />}
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

export type SimCar = {
  name: string;
  color: string;
  gears: Gear[];
  input: RunInput & { knownSixtyFtS: number | null };
  /** The car whose tab is open: its tiles and tables are shown. */
  active: boolean;
};

type Props = {
  cars: SimCar[];
  conditions: TrackConditions;
  onConditionsChange: (conditions: TrackConditions) => void;
};

// Runs are slow-ish (the launch search runs the first 60 ft many times), so keep recent results:
// changing one car doesn't re-run the others.
const runCache = new Map<string, QuarterMileRun>();
function cachedRun(input: RunInput & { knownSixtyFtS: number | null }): QuarterMileRun {
  const key = JSON.stringify(input);
  const hit = runCache.get(key);
  if (hit) return hit;
  const run = runQuarterMile(input);
  runCache.set(key, run);
  if (runCache.size > 40) runCache.delete(runCache.keys().next().value as string);
  return run;
}

/** Air density ratio and, for weather, the density altitude it works out to. */
export function airFor(conditions: TrackConditions): { ratio: number; densityAltitudeFt: number | null } {
  if (conditions.mode === "da") return { ratio: densityRatioAtAltitude(conditions.densityAltitudeFt), densityAltitudeFt: conditions.densityAltitudeFt };
  if (conditions.mode === "weather") return densityFromWeather(conditions.tempF, conditions.baroInHg, conditions.humidityPct);
  return { ratio: 1, densityAltitudeFt: null };
}

/** Quarter-mile results for every car, at the chosen track conditions. */
export function QuarterMileCard({ cars, conditions, onConditionsChange }: Props) {
  const air = airFor(conditions);
  const runs = useMemo(
    () =>
      cars.map((car) => ({
        ...car,
        run: cachedRun({ ...car.input, curve: airCorrectedCurve(car.input.curve, air.ratio), airDensityRatio: air.ratio }),
      })),
    [cars, air.ratio],
  );
  const active = runs.find((car) => car.active) ?? null;
  // Any change to a car's setup or the air restarts the replay (names, colors and the open tab don't).
  const replayKey = JSON.stringify([air.ratio, cars.map((car) => car.input)]);
  // Finishing order: quickest ET first, cars that didn't finish last (in tab order).
  const order = [...runs].sort((a, b) => (a.run.et ?? Infinity) - (b.run.et ?? Infinity));
  const winner = order[0] ?? null;

  return (
    <section className="card">
      <header className="card-header">
        <div>
          <h2>Quarter-mile simulation</h2>
        </div>
      </header>
      <ConditionsInputs conditions={conditions} onChange={onConditionsChange} air={air} />
      <div className="split-results">
        {winner ? <RunResults run={winner.run} gears={winner.gears} name={runs.length > 1 ? winner.name : null} /> : <p className="empty">No power curve.</p>}
        {runs.length > 1 ? <CompareResults order={order} /> : winner ? <TimeslipStrip run={winner.run} /> : null}
        {active ? <RunCharts runs={runs} active={active} /> : null}
        {runs.length ? <ShiftTable runs={runs} /> : null}
        {runs.length ? (
          <PassReplay key={replayKey} cars={runs.map((car) => ({ name: car.name, color: car.color, gears: car.gears, run: car.run }))} />
        ) : null}
      </div>
    </section>
  );
}

function ConditionsInputs({ conditions, onChange, air }: { conditions: TrackConditions; onChange: (c: TrackConditions) => void; air: ReturnType<typeof airFor> }) {
  const set = (patch: Partial<TrackConditions>) => onChange({ ...conditions, ...patch });
  return (
    <div className="conditions">
      <div className="field">
        <span className="field-label">Air</span>
        <Segmented<TrackConditions["mode"]>
          label="Air"
          size="small"
          value={conditions.mode}
          onChange={(mode) => set({ mode })}
          options={[
            { value: "standard", label: "Standard" },
            { value: "da", label: "Density altitude" },
            { value: "weather", label: "Weather" },
          ]}
        />
      </div>
      {conditions.mode === "da" ? (
        <NumberField
          label="Density altitude"
          unit="ft"
          step={100}
          min={-5000}
          max={15000}
          value={conditions.densityAltitudeFt}
          onCommit={(densityAltitudeFt) => set({ densityAltitudeFt })}
        />
      ) : null}
      {conditions.mode === "weather" ? (
        <>
          <NumberField label="Temperature" unit="°F" step={1} min={-40} max={140} value={conditions.tempF} onCommit={(tempF) => set({ tempF })} />
          <NumberField
            label="Barometer (uncorrected)"
            unit="inHg"
            step={0.01}
            min={15}
            max={32}
            value={conditions.baroInHg}
            onCommit={(baroInHg) => set({ baroInHg })}
          />
          <NumberField label="Humidity" unit="%" step={1} min={0} max={100} value={conditions.humidityPct} onCommit={(humidityPct) => set({ humidityPct })} />
        </>
      ) : null}
      {conditions.mode !== "standard" ? (
        <p className="conditions-result">
          {conditions.mode === "weather" && air.densityAltitudeFt !== null ? `DA ${Math.round(air.densityAltitudeFt).toLocaleString()} ft · ` : ""}
          Air density {(air.ratio * 100).toFixed(1)}%
        </p>
      ) : null}
    </div>
  );
}

/** Gear and rpm as the car crosses a mark (first sample at or past it). */
function atMark(run: QuarterMileRun, ft: number) {
  // Samples are taken every few ms, so none may land past the finish line: use the last one then.
  const last = run.samples[run.samples.length - 1];
  return run.samples.find((s) => s.ft >= ft) ?? (last && last.ft >= ft - 20 ? last : undefined);
}

function RunResults({ run, gears, name }: { run: QuarterMileRun; gears: Gear[]; name: string | null }) {
  const split = (label: string) => run.splits.find((s) => s.label === label);
  const sixty = split("60 ft");
  const reading = (ft: number) => {
    const sample = atMark(run, ft);
    return sample ? `${gears[sample.gear]?.label ?? ""} · ${Math.round(sample.rpm).toLocaleString()} rpm` : null;
  };
  const eighthReading = run.eighth ? reading(660) : null;
  const trap = run.et ? atMark(run, 1320) : undefined;

  return (
    <>
      <div className="run-tiles">
        <div className="stat stat-hero">
          <p className="stat-label">1/4 mile{name ? ` · ${name}` : ""}</p>
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
        <div className="stat">
          <p className="stat-label">Trap RPM</p>
          <p className="stat-value">
            {trap ? Math.round(trap.rpm).toLocaleString() : "—"}
            <span>rpm</span>
          </p>
          <p className="stat-note">{trap ? `${gears[trap.gear]?.label ?? ""} gear at 1,320 ft` : ""}</p>
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

    </>
  );
}

/** `color` mixed toward white by `amount` (0-1). */
function lighten(color: string, amount: number) {
  const n = Number.parseInt(color.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => mix(c).toString(16).padStart(2, "0")).join("")}`;
}

/** Shade of a car's color for a gear: alternating the car's color (1st, 3rd, …) and a light tint (2nd, 4th, …). */
export const gearShade = (color: string, gear: number) => (gear % 2 === 0 ? color : lighten(color, 0.5));

/** Distance axes tick at the timing marks (the origin stays unlabelled: 0 and 60 would collide). */
export const DISTANCE_TICKS = [60, 330, 660, 1000, 1320];
export const COMPLETION_TICKS = [0, 330, 660, 1000, 1320];

/** Speed chart: speed vs time, speed vs distance, or distance vs time ("completion"). */
type SpeedAxis = "time" | "distance" | "completion";
type CarRun = SimCar & { run: QuarterMileRun };

/**
 * Speed and rpm traces. One car: coloured by gear, with shift markers. Several: each car in its own
 * color, a shade lighter each gear, labelled at the end. The speed chart can run on time or distance
 * or show distance against time ("completion", the default when comparing). The rpm chart runs on
 * distance. Dots mark the 1/8 and 1/4.
 */
function RunCharts({ runs, active }: { runs: CarRun[]; active: CarRun }) {
  const comparing = runs.length > 1;
  const [axisChoice, setAxisChoice] = useState<SpeedAxis | null>(null);
  // Going from one car to several (or back) returns to that mode's default axis.
  useEffect(() => setAxisChoice(null), [comparing]);
  const speedAxis: SpeedAxis = axisChoice ?? (comparing ? "completion" : "time");
  const shown = comparing ? runs : [active];

  const sampleFt = (run: QuarterMileRun, t: number) =>
    run.samples.reduce((best, s) => (Math.abs(s.t - t) < Math.abs(best.t - t) ? s : best), run.samples[0])?.ft ?? 0;
  const markers = (axis: SpeedAxis) => {
    const { run, gears } = active;
    const shiftMarks = comparing
      ? []
      : run.shifts.map((shift) => ({ x: axis !== "distance" ? shift.t : sampleFt(run, shift.t), label: `→${gears[shift.toGear]?.label ?? ""}` }));
    const distance =
      axis === "distance"
        ? [
            { x: 660, label: "1/8", kind: "distance" as const },
            { x: 1320, label: "1/4", kind: "distance" as const },
          ]
        : comparing
          ? []
          : [
              ...(run.eighth ? [{ x: run.eighth.et, label: "1/8", kind: "distance" as const }] : []),
              ...(run.et ? [{ x: run.et, label: "1/4", kind: "distance" as const }] : []),
            ];
    return [...shiftMarks, ...distance];
  };

  const traces = (value: (s: Sample) => number, axis: SpeedAxis): Series[] =>
    shown.flatMap((car, carIndex) => {
      const segments = car.gears
        .map((gear, index) => ({ gear, index, samples: car.run.samples.filter((s) => s.gear === index) }))
        .filter((segment) => segment.samples.length);
      return segments.map(({ gear, index, samples }, i) => {
        // Each segment runs on to the next one's first sample, so a car's line has no gaps.
        const next = segments[i + 1]?.samples[0];
        const points = [...samples, ...(comparing && next ? [next] : [])].map((s) => ({ x: axis !== "distance" ? s.t : s.ft, y: value(s), ft: s.ft, t: s.t }));
        return comparing
          ? {
              key: `car${carIndex}-${gear.label}`,
              label: `${car.name} ${gear.label}`,
              color: gearShade(car.color, index),
              points,
              endLabel: i === segments.length - 1 ? car.name : "",
            }
          : { key: gear.label, label: gear.label, color: gear.color, points };
      });
    });

  const dots = (value: (s: Sample) => number, axis: SpeedAxis): ChartDot[] =>
    shown.flatMap((car, carIndex) => {
      const marks = [
        { label: "1/8", ft: 660, et: car.run.eighth?.et, mph: car.run.eighth?.mph },
        { label: "1/4", ft: 1320, et: car.run.et ?? undefined, mph: car.run.trapMph ?? undefined },
      ];
      return marks.flatMap((mark) => {
        const sample = atMark(car.run, mark.ft);
        if (mark.et === undefined || mark.mph === undefined || !sample) return [];
        return [
          {
            key: `${carIndex}-${mark.label}`,
            x: axis !== "distance" ? mark.et : mark.ft,
            y: axis === "completion" ? mark.ft : value(sample),
            color: comparing ? car.color : (car.gears[sample.gear]?.color ?? car.color),
            label: `${comparing ? `${car.name} ` : ""}${mark.label}: ${mark.et.toFixed(3)} s @ ${mark.mph.toFixed(1)} mph`,
          },
        ];
      });
    });

  const formatT = (t: number) => (t % 1 === 0 ? String(t) : t.toFixed(1));
  const formatFt = (ft: number) => (ft >= 1000 ? ft.toLocaleString() : String(Math.round(ft)));
  const reading = (axis: SpeedAxis, unit: string, format: (y: number) => string) => (s: Series, p: ChartPoint) =>
    axis !== "distance"
      ? `${p.x.toFixed(1)}s ${s.label} ${format(p.y)}${unit}${unit === "ft" ? "" : ` ${Math.round(p.ft ?? 0)}ft`}`
      : `${Math.round(p.x)}ft ${s.label} ${format(p.y)}${unit} ${(p.t ?? 0).toFixed(2)}s`;
  const mph = (s: Sample) => s.mph;
  const rpm = (s: Sample) => s.rpm;
  const ft = (s: Sample) => s.ft;
  const completion = speedAxis === "completion";

  return (
    <>
      <div className="chart-head">
        <Segmented<SpeedAxis>
          label="Speed chart axis"
          size="small"
          value={speedAxis}
          onChange={setAxisChoice}
          options={[
            { value: "time", label: "Time" },
            { value: "distance", label: "Distance" },
            { value: "completion", label: "Completion" },
          ]}
        />
      </div>
      <LineChart
        title={completion ? "Completion" : "Speed"}
        series={traces(completion ? ft : mph, speedAxis)}
        dots={dots(completion ? ft : mph, speedAxis)}
        endLabels={comparing}
        formatReading={completion ? reading(speedAxis, "ft", (v) => String(Math.round(v))) : reading(speedAxis, "mph", (v) => String(Math.round(v)))}
        markers={markers(speedAxis)}
        xLabel={speedAxis === "distance" ? "ft" : "s"}
        xMax={speedAxis === "distance" ? 1320 : undefined}
        xTicks={speedAxis === "distance" ? DISTANCE_TICKS : undefined}
        yTicks={completion ? COMPLETION_TICKS : undefined}
        yLabel={completion ? "ft" : "mph"}
        formatX={speedAxis === "distance" ? formatFt : formatT}
        formatY={completion ? formatFt : (v) => String(Math.round(v))}
        hMarkers={
          completion
            ? [
                { y: 660, label: "1/8" },
                { y: 1320, label: "1/4" },
              ]
            : []
        }
      />
      <LineChart
        title="Engine RPM"
        series={traces(rpm, "distance")}
        dots={dots(rpm, "distance")}
        endLabels={comparing}
        formatReading={reading("distance", "rpm", (v) => Math.round(v).toLocaleString())}
        markers={markers("distance")}
        xLabel="ft"
        xMax={1320}
        xTicks={DISTANCE_TICKS}
        yLabel="rpm"
        formatX={formatFt}
        formatY={(v) => (v >= 1000 ? `${(v / 1000).toFixed(v % 1000 ? 1 : 0)}k` : String(Math.round(v)))}
      />
    </>
  );
}

const formatGap = (seconds: number, digits = 3) =>
  `${seconds > 0 ? "+" : seconds < 0 ? "−" : "±"}${Math.abs(seconds).toFixed(digits)}`;
/** Shift table for one car: the open tab's by default, or any car picked from the list. */
function ShiftTable({ runs }: { runs: CarRun[] }) {
  const activeIndex = Math.max(0, runs.findIndex((car) => car.active));
  const [chosen, setChosen] = useState(activeIndex);
  // Opening another tab shows that car's shifts.
  useEffect(() => setChosen(activeIndex), [activeIndex]);
  const car = runs[chosen] ?? runs[activeIndex];
  if (!car) return null;
  const { run, gears } = car;
  return (
    <div className="pane">
      <div className="pane-header">
        <span className="pane-title">Shifts</span>
        {runs.length > 1 ? (
          <select aria-label="Car" className="pane-select" value={chosen} onChange={(event) => setChosen(Number(event.target.value))}>
            {runs.map((item, index) => (
              <option key={index} value={index}>
                {item.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>
      <div className="table-scroll">
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
      </div>
    </div>
  );
}

/** One car's timing slip on a single line: every mark's time, with speed at the 1/8 and 1/4. */
export function TimeslipStrip({ run }: { run: QuarterMileRun }) {
  const trap = (label: string) => (label === "1/8 mile" ? run.eighth?.mph : label === "1/4 mile" ? run.trapMph : null);
  return (
    <dl className="timeslip-strip" aria-label="Timeslip">
      {run.splits.map((split) => {
        const mph = trap(split.label);
        return (
          <div key={split.label}>
            <dt>{split.label}</dt>
            <dd>
              {split.t.toFixed(3)}
              {mph ? <span> @ {mph.toFixed(1)}</span> : null}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/** Every car's timeslip in finishing order, with each car's ET behind the winner; the open tab's row in bold. */
function CompareResults({ order }: { order: CarRun[] }) {
  const runs = order;
  const base = runs[0].run.et;
  const time = (run: QuarterMileRun, label: string) => run.splits.find((s) => s.label === label)?.t.toFixed(3) ?? "—";
  return (
    <div className="table-scroll">
      <table className="data-table compare-table">
        <thead>
          <tr>
            <th scope="col">Car</th>
            <th scope="col" className="num">60 ft</th>
            <th scope="col" className="num">330 ft</th>
            <th scope="col" className="num">1/8 mile</th>
            <th scope="col" className="num">1,000 ft</th>
            <th scope="col" className="num">1/4 mile</th>
            <th scope="col" className="num">Trap RPM</th>
            {runs.length > 1 ? <th scope="col" className="num">Δ ET</th> : null}
          </tr>
        </thead>
        <tbody>
          {runs.map((car, index) => {
            const { run } = car;
            const trap = run.et ? atMark(run, 1320) : undefined;
            const delta = index > 0 && base !== null && run.et !== null ? run.et - base : null;
            const feet = index > 0 ? marginFt(run, runs[0].run) : null;
            return (
              <tr key={index} className={car.active ? "active" : undefined}>
                <th scope="row">
                  <span className="legend-swatch" style={{ background: car.color }} />
                  {car.name}
                </th>
                <td className="num">{time(run, "60 ft")}</td>
                <td className="num">{time(run, "330 ft")}</td>
                <td className="num">
                  {run.eighth ? `${run.eighth.et.toFixed(3)} @ ${run.eighth.mph.toFixed(1)}` : "—"}
                </td>
                <td className="num">{time(run, "1,000 ft")}</td>
                <td className="num">{run.et !== null && run.trapMph !== null ? `${run.et.toFixed(3)} @ ${run.trapMph.toFixed(1)}` : "—"}</td>
                <td className="num">{trap ? `${Math.round(trap.rpm).toLocaleString()} · ${car.gears[trap.gear]?.label ?? ""}` : "—"}</td>
                {runs.length > 1 ? (
                  <td className="num">{delta === null ? "—" : `${formatGap(delta)}${feet !== null ? ` · ${feet.toFixed(1)} ft` : ""}`}</td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
