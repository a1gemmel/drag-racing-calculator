import { DEFAULT_VEHICLE, type QuarterMileRun, type RunResult, type Sample } from "./quarterMile";

/**
 * Simple mode (phones): a quarter-mile pass from horsepower, weight and tires alone, with no gearbox.
 *
 * The car is a point mass driven at constant wheel power, as if an ideal transmission held the engine
 * at its power peak, limited by traction off the line:
 *   wheel power = crank hp × (1 − SIMPLE_DRIVELINE_LOSS) × GEARING_UTILIZATION
 *   drive force = min(traction limit, wheel power / speed)
 * GEARING_UTILIZATION stands for the power a real car loses to rpm drops and shifts (the engine spends
 * most of a pass below its peak). It is calibrated so the simulated trap speed reproduces Hale's
 * trap-speed rule (trap = 234 × (hp / lb)^⅓, crank hp) that the full mode's power estimate uses.
 * Traction, weight transfer, aero, rolling resistance, rotating mass, rollout timing and the trap
 * windows use the full simulator's defaults (DEFAULT_VEHICLE), so the two modes agree on a default car.
 */

/** Generic crank-to-wheels loss for simple mode (no transmission is chosen). */
export const SIMPLE_DRIVELINE_LOSS = 0.15;
/** Share of peak wheel power a geared car averages over a pass (see the header). */
export const GEARING_UTILIZATION = 0.94;
/** Wheels, driveline and engine inertia as extra effective mass (the full sim's 1.04 + 0.0025·ratio², averaged). */
const ROTATING_MASS = 1.08;

export type SimpleSetup = {
  /** Peak crank (flywheel) horsepower. */
  hp: number;
  weightLb: number;
  /** Tire friction coefficient and rolling resistance (from a tire preset). */
  grip: number;
  rollingResistance: number;
  /** A known 60 ft (s) to fit the launch to, or null for the estimate. */
  knownSixtyFtS: number | null;
};

export const DEFAULT_SIMPLE: SimpleSetup = { hp: 400, weightLb: 3700, grip: 1.0, rollingResistance: 0.015, knownSixtyFtS: null };

const LB_TO_KG = 0.45359237;
const HP_TO_W = 745.69987;
const FT_TO_M = 0.3048;
const FT2_TO_M2 = 0.09290304;
const MPS_TO_MPH = 2.2369362921;
const G = 9.80665;
const AIR_DENSITY = 1.2;
const DT = 0.001;
const SAMPLE_EVERY = 0.02;
const QUARTER_FT = 1320;
const SPLITS = [
  { label: "60 ft", ft: 60 },
  { label: "330 ft", ft: 330 },
  { label: "1/8 mile", ft: 660 },
  { label: "1,000 ft", ft: 1000 },
  { label: "1/4 mile", ft: QUARTER_FT },
];
const TRAPS = [594, 1254];

/** Wheel horsepower simple mode uses for a crank figure (driveline loss only; utilization is internal). */
export const simpleWheelHp = (hp: number) => hp * (1 - SIMPLE_DRIVELINE_LOSS);

function run(setup: SimpleSetup, launchScale: number, stopAtFt = QUARTER_FT): RunResult {
  const v0 = DEFAULT_VEHICLE;
  const mass = setup.weightLb * LB_TO_KG;
  const power = setup.hp * HP_TO_W * (1 - SIMPLE_DRIVELINE_LOSS) * GEARING_UTILIZATION;
  const grip = setup.grip;
  const hOverL = v0.cgHeightIn / v0.wheelbaseIn;
  // Rear-wheel drive with steady-state weight transfer, as the full sim's default car.
  const traction = (grip * mass * G * v0.driveWeightFraction) / Math.max(1 - grip * hOverL, 0.2);
  const dragFactor = 0.5 * AIR_DENSITY * v0.dragCoefficient * v0.frontalAreaFt2 * FT2_TO_M2;
  const rolling = setup.rollingResistance * mass * G;
  const effectiveMass = mass * ROTATING_MASS;
  const sixtyM = 60 * FT_TO_M;
  const stopM = stopAtFt * FT_TO_M;
  const rolloutFt = v0.rolloutIn / 12;
  const watch = [rolloutFt, ...SPLITS.map((s) => s.ft), ...TRAPS];
  const crossings = new Map<number, { t: number; v: number }>();
  const samples: Sample[] = [];
  let t = 0;
  let x = 0;
  let v = 0;
  let nextSample = 0;

  while (x < stopM && t < 60) {
    const tractionNow = traction * (x < sixtyM ? launchScale : 1);
    const drive = Math.min(tractionNow, power / Math.max(v, 0.5));
    const resist = dragFactor * v * v + (v > 0 ? rolling : 0);
    const accel = Math.max((drive - resist) / effectiveMass, v > 0 ? -Infinity : 0);
    const prevX = x;
    const prevV = v;
    v = Math.max(0, v + accel * DT);
    x += v * DT;
    t += DT;
    for (const ft of watch) {
      const target = ft * FT_TO_M;
      if (!crossings.has(ft) && prevX < target && x >= target) {
        const frac = (target - prevX) / (x - prevX);
        crossings.set(ft, { t: t - DT + frac * DT, v: prevV + (v - prevV) * frac });
      }
    }
    if (t >= nextSample) {
      samples.push({ t, ft: x / FT_TO_M, mph: v * MPS_TO_MPH, rpm: 0, gear: 0, shifting: false });
      nextSample += SAMPLE_EVERY;
    }
  }

  const finished = x >= QUARTER_FT * FT_TO_M;
  const start = crossings.get(rolloutFt)?.t ?? 0;
  const trap = (from: number, to: number) => {
    const a = crossings.get(from);
    const b = crossings.get(to);
    return a && b ? (((to - from) * FT_TO_M) / (b.t - a.t)) * MPS_TO_MPH : null;
  };
  const eighth = crossings.get(660);
  const eighthMph = trap(594, 660);
  return {
    finished,
    samples: samples.filter((s) => s.t >= start).map((s) => ({ ...s, t: s.t - start })),
    splits: SPLITS.flatMap((s) => {
      const hit = crossings.get(s.ft);
      return hit ? [{ label: s.label, ft: s.ft, t: hit.t - start, mph: hit.v * MPS_TO_MPH }] : [];
    }),
    et: finished ? (crossings.get(QUARTER_FT)?.t ?? 0) - start : null,
    trapMph: trap(1254, QUARTER_FT),
    eighth: eighth && eighthMph !== null ? { et: eighth.t - start, mph: eighthMph } : null,
    shifts: [],
    warnings: finished || stopAtFt < QUARTER_FT ? [] : ["Did not finish within 60 s"],
  };
}

/** The simple-mode pass. With a known 60 ft, traction over the first 60 ft is scaled to hit it. */
export function simulateSimplePass(setup: SimpleSetup): QuarterMileRun {
  const target = setup.knownSixtyFtS;
  if (target === null || !(target > 0)) return { ...run(setup, 1), launchRpm: 0, sixtyFtSource: "best", launchScale: 1 };
  let lo = 0.02;
  let hi = 4;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const sixty = run(setup, mid, 60).splits[0]?.t ?? Infinity;
    if (sixty > target) lo = mid;
    else hi = mid;
  }
  const launchScale = (lo + hi) / 2;
  const result = run(setup, launchScale);
  const reached = result.splits[0]?.t;
  if (reached !== undefined && Math.abs(reached - target) > 0.005) {
    result.warnings.push(`Known 60 ft ${target.toFixed(2)} s not reachable; closest ${reached.toFixed(2)} s`);
  }
  return { ...result, launchRpm: 0, sixtyFtSource: "known", launchScale };
}
