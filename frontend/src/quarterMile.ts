import { torqueAt, type PowerBasis, type PowerCurve } from "./power";

/**
 * Mid-fidelity quarter-mile simulation. Time-steps a point mass with:
 *  - torque from the power curve through gear × axle; crank curves lose a fixed drivetrain fraction,
 *    wheel (chassis dyno) curves already include it
 *  - a traction limit: grip × load on the driven wheels, including steady-state weight transfer
 *    (CG height / wheelbase) toward the rear under acceleration
 *  - aero drag and rolling resistance
 *  - rotating inertia as an effective-mass factor that grows with overall ratio
 *  - a clutch launch: the engine holds launch RPM until the car is fast enough for 1st gear to lock up;
 *    while it slips, the engine's rotating mass isn't being accelerated, so only the wheels' inertia counts
 *  - timing-light rollout: the clock starts after the car has rolled `rolloutIn` (splits, ET and shift
 *    times are on that clock, like a timing slip)
 *  - upshifts at shift RPM with no drive force for the shift time; a limiter at shift RPM in top gear
 * Not modelled: suspension dynamics, tire growth/slip curves, converter/automatics, wind, altitude.
 */

export type VehicleSetup = {
  weightLb: number; // race weight including driver
  drivetrainLoss: number; // fraction of crank torque lost, e.g. 0.15
  grip: number; // tire friction coefficient (street ≈ 0.9, drag radial ≈ 1.3, slick ≈ 1.6+)
  drive: "rear" | "front" | "awd";
  driveWeightFraction: number; // static share of weight on the driven wheels (ignored for AWD)
  cgHeightIn: number;
  wheelbaseIn: number;
  dragCoefficient: number;
  frontalAreaFt2: number;
  rollingResistance: number;
  shiftTimeS: number;
  launchRpm: number;
  rolloutIn: number; // distance rolled before the timer starts; 11.5 in is typical
  /** A measured 60 ft to fit the launch to; null estimates the best 60 ft instead. */
  knownSixtyFtS: number | null;
};

export const DEFAULT_VEHICLE: VehicleSetup = {
  weightLb: 3700,
  drivetrainLoss: 0.15,
  grip: 1.0,
  drive: "rear",
  driveWeightFraction: 0.5,
  cgHeightIn: 20,
  wheelbaseIn: 105,
  dragCoefficient: 0.35,
  frontalAreaFt2: 22,
  rollingResistance: 0.015,
  shiftTimeS: 0.15,
  launchRpm: 3500,
  rolloutIn: 11.5,
  knownSixtyFtS: null,
};

export type RunInput = VehicleSetup & {
  curve: PowerCurve;
  /** "wheel" curves already include drivetrain loss, so drivetrainLoss is ignored. Defaults to "crank". */
  curveBasis?: PowerBasis;
  gearRatios: number[];
  axleRatio: number;
  tireDiameterIn: number;
  shiftRpm: number;
  /** Multiplies the available drive force (engine and traction) for the first 60 ft. Used to fit a known 60 ft. */
  launchScale?: number;
  /** End the run early at this distance (ft). Used for fast launch-only searches. */
  stopAtFt?: number;
};

export type Sample = { t: number; ft: number; mph: number; rpm: number; gear: number; shifting: boolean; tractionLimited: boolean };
export type Split = { label: string; ft: number; t: number; mph: number };
export type RunResult = {
  finished: boolean;
  samples: Sample[];
  splits: Split[];
  /** Elapsed time at 1,320 ft, timed from rollout. */
  et: number | null;
  /** NHRA-style trap: average speed over the last 66 ft (1,254–1,320 ft). */
  trapMph: number | null;
  /** Eighth-mile ET and trap (594–660 ft). */
  eighth: { et: number; mph: number } | null;
  shifts: { t: number; mph: number; toGear: number }[];
  warnings: string[];
};

const LB_TO_KG = 0.45359237;
const LBFT_TO_NM = 1.3558179483;
const FT_TO_M = 0.3048;
const FT2_TO_M2 = 0.09290304;
const MPS_TO_MPH = 2.2369362921;
const G = 9.80665;
const AIR_DENSITY = 1.2; // kg/m³, about sea level at 20 °C
const DT = 0.001;
const SAMPLE_EVERY = 0.02;
const MAX_TIME = 60;
const QUARTER_FT = 1320;

const SPLIT_POINTS = [
  { label: "60 ft", ft: 60 },
  { label: "330 ft", ft: 330 },
  { label: "1/8 mile", ft: 660 },
  { label: "1,000 ft", ft: 1000 },
  { label: "1/4 mile", ft: QUARTER_FT },
];
const TRAP_POINTS = [594, 1254];

export function simulateQuarterMile(input: RunInput): RunResult {
  const warnings: string[] = [];
  const { curve, gearRatios, axleRatio, tireDiameterIn, shiftRpm } = input;
  if (curve.length === 0 || gearRatios.length === 0) {
    return { finished: false, samples: [], splits: [], et: null, trapMph: null, eighth: null, shifts: [], warnings: ["No power curve or gears."] };
  }

  const mass = input.weightLb * LB_TO_KG;
  const radius = (tireDiameterIn / 2) * 0.0254;
  const efficiency = input.curveBasis === "wheel" ? 1 : 1 - input.drivetrainLoss;
  // Max tractive force with steady-state weight transfer: the driven axle's load changes by F·h/L,
  // so F = μ(W·f ± F·h/L), solved for F.
  const weightN = mass * G;
  const hOverL = input.cgHeightIn / input.wheelbaseIn;
  const tractionLimitN =
    input.drive === "awd"
      ? input.grip * weightN
      : input.drive === "rear"
        ? (input.grip * weightN * input.driveWeightFraction) / Math.max(1 - input.grip * hOverL, 0.2)
        : (input.grip * weightN * input.driveWeightFraction) / (1 + input.grip * hOverL);
  const dragFactor = 0.5 * AIR_DENSITY * input.dragCoefficient * input.frontalAreaFt2 * FT2_TO_M2;
  const rollingN = input.rollingResistance * mass * G;
  const launchRpm = Math.min(input.launchRpm, shiftRpm);
  const curveMaxRpm = curve[curve.length - 1].rpm;
  if (shiftRpm > curveMaxRpm) {
    warnings.push(`Power curve ends at ${curveMaxRpm.toLocaleString()} rpm; torque held flat to ${shiftRpm.toLocaleString()} rpm`);
  }

  const wheelRpm = (v: number) => (v / radius) * (60 / (2 * Math.PI));
  // Effective-mass factor for rotating parts (wheels, driveline, engine), a common textbook approximation.
  const massFactor = (overall: number) => 1.04 + 0.0025 * overall * overall;

  let t = 0;
  let x = 0; // m
  let v = 0; // m/s
  let gear = 0;
  let shiftTimer = 0;
  let nextSample = 0;
  let tractionLimitedTime = 0;
  const samples: Sample[] = [];
  const shifts: RunResult["shifts"] = [];
  const crossings = new Map<number, { t: number; v: number }>();
  const rolloutFt = Math.max(input.rolloutIn, 0) / 12;
  const watch = [rolloutFt, ...SPLIT_POINTS.map((s) => s.ft), ...TRAP_POINTS];

  const launchScale = input.launchScale ?? 1;
  const sixtyM = 60 * FT_TO_M;
  const stopM = Math.min(input.stopAtFt ?? QUARTER_FT, QUARTER_FT) * FT_TO_M;

  while (x < stopM && t < MAX_TIME) {
    const overall = gearRatios[gear] * axleRatio;
    const lockedRpm = wheelRpm(v) * overall;
    const shifting = shiftTimer > 0;
    // In 1st, the clutch slips and holds launch RPM until the drivetrain catches up.
    const engineRpm = shifting ? lockedRpm : gear === 0 ? Math.max(launchRpm, lockedRpm) : lockedRpm;

    let engineDriveN = 0;
    if (!shifting && !(gear === gearRatios.length - 1 && engineRpm >= shiftRpm)) {
      engineDriveN = (torqueAt(curve, engineRpm) * LBFT_TO_NM * overall * efficiency) / radius;
    }
    if (x < sixtyM) engineDriveN *= launchScale;
    const launchTractionN = x < sixtyM ? tractionLimitN * launchScale : tractionLimitN;
    const resistN = dragFactor * v * v + (v > 0 ? rollingN : 0);
    // Engine-limited: the drive force also spins up the engine and driveline (full mass factor),
    // except while shifting or while the launch clutch slips (engine speed is held, not accelerated).
    // Traction-limited: the tires slip, the engine's surplus spins its own inertia, and only the
    // wheels' inertia (≈ 4%) rides on the tire force.
    const slipping = !shifting && gear === 0 && lockedRpm < launchRpm;
    const engineAccel = (engineDriveN - resistN) / (mass * (shifting || slipping ? massFactor(0) : massFactor(overall)));
    const tractionAccel = (launchTractionN - resistN) / (mass * massFactor(0));
    const tractionLimited = !shifting && tractionAccel < engineAccel;
    if (tractionLimited) tractionLimitedTime += DT;
    const accel = Math.max(Math.min(engineAccel, tractionAccel), v > 0 ? -Infinity : 0);

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

    if (shifting) {
      shiftTimer -= DT;
    } else if (gear < gearRatios.length - 1 && wheelRpm(v) * overall >= shiftRpm) {
      gear += 1;
      shiftTimer = input.shiftTimeS;
      shifts.push({ t, mph: v * MPS_TO_MPH, toGear: gear });
    }

    if (t >= nextSample) {
      samples.push({
        t,
        ft: x / FT_TO_M,
        mph: v * MPS_TO_MPH,
        rpm: shiftTimer > 0 ? wheelRpm(v) * gearRatios[gear] * axleRatio : gear === 0 ? Math.max(launchRpm, wheelRpm(v) * overall) : wheelRpm(v) * overall,
        gear,
        shifting: shiftTimer > 0,
        tractionLimited,
      });
      nextSample += SAMPLE_EVERY;
    }
  }

  const finished = x >= QUARTER_FT * FT_TO_M;
  if (!finished && input.stopAtFt === undefined) warnings.push("Did not finish within 60 s");
  if (tractionLimitedTime > 1.5) {
    warnings.push(`Traction-limited for ${tractionLimitedTime.toFixed(1)} s`);
  }

  // Timing-slip clock: zero when the car has rolled out of the staging beam.
  const clockStart = rolloutFt > 0 ? (crossings.get(rolloutFt)?.t ?? 0) : 0;
  const splits = SPLIT_POINTS.flatMap((split) => {
    const hit = crossings.get(split.ft);
    return hit ? [{ label: split.label, ft: split.ft, t: hit.t - clockStart, mph: hit.v * MPS_TO_MPH }] : [];
  });
  const trap = (from: number, to: number) => {
    const a = crossings.get(from);
    const b = crossings.get(to);
    return a && b ? (((to - from) * FT_TO_M) / (b.t - a.t)) * MPS_TO_MPH : null;
  };
  const eighth660 = crossings.get(660)?.t;
  const eighthT = eighth660 === undefined ? undefined : eighth660 - clockStart;
  const eighthMph = trap(594, 660);

  return {
    finished,
    samples: samples.filter((sample) => sample.t >= clockStart).map((sample) => ({ ...sample, t: sample.t - clockStart })),
    splits,
    et: finished ? (crossings.get(QUARTER_FT)?.t ?? 0) - clockStart : null,
    trapMph: trap(1254, QUARTER_FT),
    eighth: eighthT !== undefined && eighthMph !== null ? { et: eighthT, mph: eighthMph } : null,
    shifts: shifts.map((shift) => ({ ...shift, t: shift.t - clockStart })),
    warnings,
  };
}

export type QuarterMileRun = RunResult & {
  launchRpm: number;
  sixtyFtSource: "best" | "known";
  /** Drive-force multiplier over the first 60 ft that reproduces a known 60 ft (1 when estimating). */
  launchScale: number;
};

const LAUNCH_SEARCH_STEP = 250;
const MIN_LAUNCH_RPM = 1200;
const MAX_LAUNCH_SCALE = 4;

function sixtyFoot(input: RunInput) {
  return simulateQuarterMile({ ...input, stopAtFt: 60 }).splits[0]?.t ?? Infinity;
}

/** Launch RPM (searched in 250 rpm steps up to the shift point) that gives the quickest 60 ft. */
export function bestLaunchRpm(input: RunInput) {
  let best = { rpm: Math.min(MIN_LAUNCH_RPM, input.shiftRpm), sixty: Infinity };
  for (let rpm = MIN_LAUNCH_RPM; rpm <= input.shiftRpm; rpm += LAUNCH_SEARCH_STEP) {
    const sixty = sixtyFoot({ ...input, launchRpm: rpm });
    // Prefer the lower RPM unless a higher one is measurably quicker.
    if (sixty < best.sixty - 0.001) best = { rpm, sixty };
  }
  return best;
}

/**
 * Full run. Without a known 60 ft, launches at the RPM that gives the best 60 ft. With one, also
 * scales the drive force over the first 60 ft (binary search) so the run hits it, and the rest of
 * the pass continues from the resulting speed.
 */
export function runQuarterMile(input: RunInput & { knownSixtyFtS: number | null }): QuarterMileRun {
  const launch = bestLaunchRpm(input);
  const launched = { ...input, launchRpm: launch.rpm };
  const target = input.knownSixtyFtS;

  if (target === null || !(target > 0)) {
    return { ...simulateQuarterMile(launched), launchRpm: launch.rpm, sixtyFtSource: "best", launchScale: 1 };
  }

  let lo = 0.02;
  let hi = MAX_LAUNCH_SCALE;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (sixtyFoot({ ...launched, launchScale: mid }) > target) lo = mid;
    else hi = mid;
  }
  const launchScale = (lo + hi) / 2;
  const run = simulateQuarterMile({ ...launched, launchScale });
  const reached = run.splits[0]?.t;
  if (reached !== undefined && Math.abs(reached - target) > 0.005) {
    run.warnings.push(`Known 60 ft ${target.toFixed(2)} s not reachable; closest ${reached.toFixed(2)} s`);
  }
  return { ...run, launchRpm: launch.rpm, sixtyFtSource: "known", launchScale };
}
