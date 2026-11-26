import { launchRpm as automaticLaunchRpm, lockedInGear, type AutomaticSetup } from "./automatic";
import { curvePeaks, torqueAt, type PowerBasis, type PowerCurve } from "./power";

/**
 * Mid-fidelity quarter-mile simulation. Time-steps a point mass with:
 *  - torque from the power curve through gear × axle; crank curves lose a fixed drivetrain fraction,
 *    wheel (chassis dyno) curves already include it
 *  - a traction limit: grip × load on the driven wheels, including steady-state weight transfer
 *    (CG height / wheelbase) toward the rear under acceleration
 *  - aero drag and rolling resistance
 *  - rotating inertia: wheels/driveline (4% of mass) and the engine (0.0025·m·r², which reproduces the
 *    common 1.04 + 0.0025·ratio² effective-mass factor when everything is locked together)
 *  - a clutch launch: from launch RPM, the clutch clamps over `clutchReleaseS` and then holds; the
 *    engine slows as the clutch drags it down to driveline speed, then they turn together
 *  - tire slip: when the tires can't take the drive force, the car gets the traction limit; the driver
 *    modulates clutch and throttle to hold wheelspin to 10% slip, or 7 m/s at low speed
 *  - timing-light rollout: the clock starts after the car has rolled `rolloutIn` (splits, ET and shift
 *    times are on that clock, like a timing slip)
 *  - manual upshifts at shift RPM with no drive force for the shift time; a limiter at shift RPM in top gear
 *  - automatic upshifts are power shifts: drive continues through the new gear for the shift time, less
 *    `shiftLoss` (shift-clutch overlap and slip). Into an unlocked gear the converter takes up the speed
 *    change; into a locked gear the shift clutches slip and pull the engine down to the new gear's speed
 *    over the shift time, and the torque that releases from the engine's inertia reaches the tires
 *  - automatics (when `automatic` is set): a torque converter instead of the clutch (see below),
 *    optional lock-up per gear, and a trans-brake or foot-brake launch
 *  - air density (density altitude): drag scales with it, and callers scale the power curve by it
 *  - launch control: LAUNCH_CONTROL_GRIP × grip while traction-limited
 * Not modelled: suspension dynamics, tire growth/slip curves, wind, boost vs altitude.
 *
 * Torque converter (K-factor model). Speed ratio SR = turbine rpm / engine rpm.
 *  - Pump (engine-side) torque = (engine rpm / K)², lb-ft. K is set from the stall speed:
 *    K = stall rpm / sqrt(engine torque at stall rpm), so with the turbine held still and the throttle
 *    open the engine settles exactly at the stall speed.
 *  - Below the coupling point SRc torque is multiplied: TR falls linearly from the stall torque ratio at
 *    SR = 0 to 1.0 at SRc. The converter loosens as SR rises: capacity (1/K²) falls smoothly to
 *    COUPLING_CAPACITY (65%, i.e. K about 24% above stall K) at SRc, so engine rpm climbs from stall
 *    during the launch instead of sitting at stall.
 *  - Above SRc (coupling), TR = 1 and pump torque falls linearly to 0 at SR = 1, so the converter always
 *    slips a little. SRc is chosen so the slip at full throttle at peak power equals `couplingSlip`.
 *  - Engine and converter are separate inertias: engine speed follows engine torque − pump torque.
 *  - Lock-up (in gears `lockedInGear` allows) joins engine and driveline like a locked clutch.
 */

export type VehicleSetup = {
  weightLb: number; // race weight including driver
  drivetrainLoss: number; // fraction of crank torque lost, e.g. 0.11
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
  clutchReleaseS: number; // time for the clutch to go from launch bite to full clamp
  rolloutIn: number; // distance rolled before the timer starts; 11.5 in is typical
  /** A measured 60 ft to fit the launch to; null estimates the best 60 ft instead. */
  knownSixtyFtS: number | null;
  /**
   * Launch control / traction control: holds the tires at the peak of their slip curve, so the car gets
   * LAUNCH_CONTROL_GRIP × the grip coefficient whenever it's traction-limited.
   */
  launchControl: boolean;
};

export const DEFAULT_VEHICLE: VehicleSetup = {
  weightLb: 3700,
  drivetrainLoss: 0.11,
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
  clutchReleaseS: 0.25,
  rolloutIn: 11.5,
  knownSixtyFtS: null,
  launchControl: false,
};

export type RunInput = VehicleSetup & {
  curve: PowerCurve;
  /** "wheel" curves already include drivetrain loss, so drivetrainLoss is ignored. Defaults to "crank". */
  curveBasis?: PowerBasis;
  gearRatios: number[];
  axleRatio: number;
  tireDiameterIn: number;
  shiftRpm: number;
  /**
   * Air density relative to standard (1 = no correction). Scales aero drag; callers scale the power
   * curve by it too (see airCorrectedCurve).
   */
  airDensityRatio?: number;
  /** Multiplies the available drive force (engine and traction) for the first 60 ft. Used to fit a known 60 ft. */
  launchScale?: number;
  /** End the run early at this distance (ft). Used for fast launch-only searches. */
  stopAtFt?: number;
  /** Model tuning: clutch clamp torque as a multiple of peak engine torque. */
  clutchCapacityFactor?: number;
  /** Model tuning: wheelspin allowed at a standstill, m/s. */
  slipFloorMps?: number;
  /**
   * Automatic transmission: torque converter, lock-up and launch method. When set, its shift time,
   * drivetrain loss and launch rpm replace the vehicle's (and clutch settings are unused).
   */
  automatic?: AutomaticSetup;
};

export type Sample = { t: number; ft: number; mph: number; rpm: number; gear: number; shifting: boolean };
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
const AIR_DENSITY = 1.2; // kg/m³, about sea level at 20 °C: "standard" air for this sim
/**
 * Traction multiplier with launch control. Grip presets are what a driver gets by feel, spinning past
 * the peak of the tire's slip curve; electronic control holds the peak, where friction runs 15-30%
 * higher than in a spin. 1.2 puts a stock 2018 Mustang GT (10R80, 460 hp, 4,000 lb) on "Performance
 * street" at ~11.9 s @ 119 mph, as magazines ran it (11.83-11.98 @ 119).
 */
export const LAUNCH_CONTROL_GRIP = 1.2;
const DT = 0.001;
const SAMPLE_EVERY = 0.02;
const MAX_TIME = 60;
const QUARTER_FT = 1320;
// Tuned so a launch dips ~30-40% below launch RPM, bottoming ~0.2-0.4 s in (street to drag-radial grip).
const CLUTCH_CAPACITY_FACTOR = 1.25;
const SLIP_FLOOR_MPS = 7;

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
  const auto = input.automatic;
  const drivetrainLoss = auto ? auto.drivetrainLoss : input.drivetrainLoss;
  const efficiency = input.curveBasis === "wheel" ? 1 : 1 - drivetrainLoss;
  const shiftTimeS = auto ? auto.shiftTimeS : input.shiftTimeS;
  // Max tractive force with steady-state weight transfer: the driven axle's load changes by F·h/L,
  // so F = μ(W·f ± F·h/L), solved for F.
  const weightN = mass * G;
  const grip = input.grip * (input.launchControl ? LAUNCH_CONTROL_GRIP : 1);
  const hOverL = input.cgHeightIn / input.wheelbaseIn;
  const tractionLimitN =
    input.drive === "awd"
      ? grip * weightN
      : input.drive === "rear"
        ? (grip * weightN * input.driveWeightFraction) / Math.max(1 - grip * hOverL, 0.2)
        : (grip * weightN * input.driveWeightFraction) / (1 + grip * hOverL);
  const dragFactor = 0.5 * AIR_DENSITY * (input.airDensityRatio ?? 1) * input.dragCoefficient * input.frontalAreaFt2 * FT2_TO_M2;
  const rollingN = input.rollingResistance * mass * G;
  const launchRpm = Math.min(auto ? automaticLaunchRpm(auto) : input.launchRpm, shiftRpm);
  const curveMaxRpm = curve[curve.length - 1].rpm;
  if (shiftRpm > curveMaxRpm) {
    warnings.push(`Power curve ends at ${curveMaxRpm.toLocaleString()} rpm; torque held flat to ${shiftRpm.toLocaleString()} rpm`);
  }

  const RAD_TO_RPM = 60 / (2 * Math.PI);
  const engineInertia = 0.0025 * mass * radius * radius; // kg·m² at the crank
  const wheelMass = 0.04 * mass; // wheels and driveline, as equivalent mass at the tire
  const engineMass = (k: number) => engineInertia * k * k; // engine as equivalent mass at the tire
  const peakTorqueNm = Math.max(...curve.map((p) => p.torque)) * LBFT_TO_NM;
  const clutchCapacityNm = (input.clutchCapacityFactor ?? CLUTCH_CAPACITY_FACTOR) * peakTorqueNm;
  const torqueNm = (rpm: number) => torqueAt(curve, rpm) * LBFT_TO_NM;
  const SLIP_RATIO = 0.1;
  const SLIP_FLOOR = input.slipFloorMps ?? SLIP_FLOOR_MPS; // m/s of wheelspin allowed at low speed
  const maxWheelSpeed = (carSpeed: number) => Math.max(carSpeed * (1 + SLIP_RATIO), carSpeed + SLIP_FLOOR);

  // Torque converter constants (see the header comment).
  const converter = auto ? converterConstants(auto, curve, shiftRpm) : null;

  let t = 0;
  let x = 0; // car position, m
  let v = 0; // car speed, m/s
  let u = 0; // tire surface speed, m/s (> v while the tires spin)
  let omega = launchRpm / RAD_TO_RPM; // engine speed, rad/s
  let clutchLocked = false;
  let gear = 0;
  let shiftTimer = 0;
  let nextSample = 0;
  const samples: Sample[] = [];
  const shifts: RunResult["shifts"] = [];
  const crossings = new Map<number, { t: number; v: number }>();
  const rolloutFt = Math.max(input.rolloutIn, 0) / 12;
  const watch = [rolloutFt, ...SPLIT_POINTS.map((s) => s.ft), ...TRAP_POINTS];
  const launchScale = input.launchScale ?? 1;
  const sixtyM = 60 * FT_TO_M;
  const stopM = Math.min(input.stopAtFt ?? QUARTER_FT, QUARTER_FT) * FT_TO_M;

  while (x < stopM && t < MAX_TIME) {
    const k = (gearRatios[gear] * axleRatio) / radius; // engine rad/s per m/s at the tire
    const scale = x < sixtyM ? launchScale : 1;
    const tractionN = tractionLimitN * scale;
    const resistN = dragFactor * v * v + (v > 0 ? rollingN : 0);
    const shifting = shiftTimer > 0;
    const engineRpm = omega * RAD_TO_RPM;
    const limiter = gear === gearRatios.length - 1 && engineRpm >= shiftRpm;
    // Manuals coast through a shift; automatics keep the throttle open (power shift).
    const engineNm = (shifting && !converter) || limiter ? 0 : torqueNm(engineRpm) * scale;
    let accel: number;

    const converterLocked = auto ? lockedInGear(auto, gear, gearRatios.length) : false;
    // During an automatic shift the shift clutches lose part of the drive.
    const shiftEfficiency = shifting && auto ? 1 - auto.shiftLoss : 1;
    // Engine decoupled from the tires (slipping clutch or converter): the car gets the drive force,
    // or the traction limit when the tires can't take it.
    const decoupledDrive = (driveN: number) => {
      if (u > v + 1e-6 || driveN - resistN > ((tractionN - resistN) * (mass + wheelMass)) / mass) {
        const a = (tractionN - resistN) / mass;
        u = Math.min(Math.max(u + ((driveN - tractionN) / wheelMass) * DT, v + a * DT), maxWheelSpeed(v + a * DT));
        return a;
      }
      const a = (driveN - resistN) / (mass + wheelMass);
      u = v + a * DT;
      return a;
    };

    if (shifting && !converter) {
      // Clutch open: the car coasts; the engine is matched to the next gear when the shift completes.
      accel = -resistN / (mass + wheelMass);
      u = Math.max(0, v + accel * DT);
    } else if (shifting && converterLocked) {
      // Power shift into a locked gear: the shift clutches slip, pulling the engine down to the new
      // gear's speed by the end of the shift. Their torque (engine torque plus what slowing the engine
      // releases) drives the new gear; the slip and `shiftLoss` are lost.
      const targetOmega = u * k;
      const clutchNm = Math.max(engineNm + (engineInertia * Math.max(omega - targetOmega, 0)) / Math.max(shiftTimer, DT), 0);
      omega = Math.max(omega + ((engineNm - clutchNm) / engineInertia) * DT, targetOmega);
      accel = decoupledDrive(clutchNm * k * efficiency * shiftEfficiency);
    } else if (converter && !converterLocked) {
      // Torque converter driving: engine and turbine turn at different speeds.
      const engineRpmNow = omega * RAD_TO_RPM;
      const speedRatio = engineRpmNow > 1 ? Math.min(Math.max((u * k * RAD_TO_RPM) / engineRpmNow, 0), 1) : 1;
      const capacityLbft = (engineRpmNow / converter.k) ** 2;
      const pumpNm = capacityLbft * converterCapacity(speedRatio, converter.couplingRatio) * LBFT_TO_NM;
      const torqueRatio =
        speedRatio < converter.couplingRatio ? auto!.stallTorqueRatio - ((auto!.stallTorqueRatio - 1) * speedRatio) / converter.couplingRatio : 1;
      // Shifting into an unlocked gear: the converter takes up the speed change.
      const driveN = pumpNm * torqueRatio * k * efficiency * shiftEfficiency;
      omega = Math.max(omega + ((engineNm - pumpNm) / engineInertia) * DT, 0);
      accel = decoupledDrive(driveN);
    } else if (!converter && !clutchLocked) {
      // Launch: clutch slipping. Its torque ramps from what the engine makes at launch RPM to full clamp.
      const ramp = input.clutchReleaseS > 0 ? Math.min(t / input.clutchReleaseS, 1) : 1;
      const launchNm = torqueNm(launchRpm) * scale;
      const clutchNm = launchNm + (clutchCapacityNm * scale - launchNm) * ramp;
      const driveN = clutchNm * k * efficiency;
      omega = Math.max(omega + ((engineNm - clutchNm) / engineInertia) * DT, 0);
      accel = decoupledDrive(driveN);
      if (omega <= u * k) {
        clutchLocked = true;
        omega = u * k;
      }
    } else {
      // Clutch (or converter lock-up) locked: engine and driveline turn together.
      const driveN = engineNm * k * efficiency;
      const gripAccel = (driveN - resistN) / (mass + wheelMass + engineMass(k));
      const tireForceNeeded = mass * gripAccel + resistN;
      if (u > v + 1e-6 || tireForceNeeded > tractionN) {
        accel = (tractionN - resistN) / mass;
        u += ((driveN - tractionN) / (wheelMass + engineMass(k))) * DT;
        u = Math.min(Math.max(u, v + accel * DT), maxWheelSpeed(v + accel * DT));
      } else {
        accel = gripAccel;
        u = v + accel * DT;
      }
      omega = u * k;
    }

    if (v <= 0 && accel < 0) accel = 0;
    const prevX = x;
    const prevV = v;
    v = Math.max(0, v + accel * DT);
    if (u < v) u = v;
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
      // Manual: clutch back in at the new gear. Automatic: the converter takes up the difference,
      // unless the new gear is locked up.
      if (shiftTimer <= 0 && (!converter || lockedInGear(auto!, gear, gearRatios.length))) omega = u * k;
    } else if ((converter || clutchLocked) && gear < gearRatios.length - 1 && omega * RAD_TO_RPM >= shiftRpm) {
      gear += 1;
      // A power shift takes at least one step, so the engine's inertia always goes through the clutches.
      shiftTimer = converter ? Math.max(shiftTimeS, DT) : shiftTimeS;
      shifts.push({ t, mph: v * MPS_TO_MPH, toGear: gear });
      u = v;
      if (shiftTimer <= 0 && (!converter || lockedInGear(auto!, gear, gearRatios.length))) {
        omega = v * ((gearRatios[gear] * axleRatio) / radius);
      }
    }

    if (t >= nextSample) {
      const kNow = (gearRatios[gear] * axleRatio) / radius;
      samples.push({
        t,
        ft: x / FT_TO_M,
        mph: v * MPS_TO_MPH,
        rpm: (shiftTimer > 0 && !converter ? u * kNow : omega) * RAD_TO_RPM,
        gear,
        shifting: shiftTimer > 0,
      });
      nextSample += SAMPLE_EVERY;
    }
  }

  const finished = x >= QUARTER_FT * FT_TO_M;
  if (!finished && input.stopAtFt === undefined) warnings.push("Did not finish within 60 s");

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

/** Converter capacity at the coupling point, relative to stall capacity (K rises ~24% from stall). */
const COUPLING_CAPACITY = 0.65;

/** Pump torque as a fraction of (rpm / K_stall)² at speed ratio `sr` (see the header comment). */
export function converterCapacity(sr: number, couplingRatio: number) {
  if (sr < couplingRatio) return 1 - (1 - COUPLING_CAPACITY) * (sr / couplingRatio) ** 2;
  return (COUPLING_CAPACITY * (1 - sr)) / (1 - couplingRatio);
}

/**
 * K-factor at stall (rpm / sqrt(lb-ft)) from the stall speed, and the coupling speed ratio that gives
 * the set full-throttle slip at peak power (clamped to 0.6-0.95).
 */
export function converterConstants(auto: AutomaticSetup, curve: PowerCurve, shiftRpm: number) {
  const k = auto.stallRpm / Math.sqrt(Math.max(torqueAt(curve, auto.stallRpm), 1));
  const peakRpm = Math.min(curvePeaks(curve).hp.rpm || shiftRpm, shiftRpm);
  const capacityAtPeak = COUPLING_CAPACITY * (peakRpm / k) ** 2;
  const slipSpan = (auto.couplingSlip * capacityAtPeak) / Math.max(torqueAt(curve, peakRpm), 1);
  const couplingRatio = Math.min(Math.max(1 - slipSpan, 0.6), 0.95);
  return { k, couplingRatio };
}

export type QuarterMileRun = RunResult & {
  launchRpm: number;
  /** best: launch rpm searched (manual); estimate: automatic launch from its settings; known: fitted. */
  sixtyFtSource: "best" | "estimate" | "known";
  /** Drive-force multiplier over the first 60 ft that reproduces a known 60 ft (1 when estimating). */
  launchScale: number;
};

const LAUNCH_SEARCH_STEP = 250;
const MIN_LAUNCH_RPM = 1200;
const MAX_LAUNCH_SCALE = 4;

function sixtyFoot(input: RunInput) {
  return simulateQuarterMile({ ...input, stopAtFt: 60 }).splits[0]?.t ?? Infinity;
}

/**
 * Launch RPM (searched in 250 rpm steps up to the shift point) that gives the quickest 60 ft. When
 * grip is the limit many RPMs tie; among those within 5 ms of the best, the one nearest the torque
 * peak wins.
 */
export function bestLaunchRpm(input: RunInput) {
  const tried: { rpm: number; sixty: number }[] = [];
  for (let rpm = MIN_LAUNCH_RPM; rpm <= input.shiftRpm; rpm += LAUNCH_SEARCH_STEP) {
    tried.push({ rpm, sixty: sixtyFoot({ ...input, launchRpm: rpm }) });
  }
  if (tried.length === 0) return { rpm: input.shiftRpm, sixty: sixtyFoot({ ...input, launchRpm: input.shiftRpm }) };
  const quickest = Math.min(...tried.map((c) => c.sixty));
  const peakRpm = input.curve.reduce((best, p) => (p.torque > best.torque ? p : best)).rpm;
  return tried
    .filter((c) => c.sixty <= quickest + 0.005)
    .reduce((best, c) => (Math.abs(c.rpm - peakRpm) < Math.abs(best.rpm - peakRpm) ? c : best));
}

/**
 * Full run. Without a known 60 ft, launches at the RPM that gives the best 60 ft. With one, also
 * scales the drive force over the first 60 ft (binary search) so the run hits it, and the rest of
 * the pass continues from the resulting speed.
 */
export function runQuarterMile(input: RunInput & { knownSixtyFtS: number | null }): QuarterMileRun {
  // Automatics launch from their trans-brake / foot-brake rpm; manuals search for the best launch rpm.
  const launch = input.automatic
    ? { rpm: Math.min(automaticLaunchRpm(input.automatic), input.shiftRpm) }
    : bestLaunchRpm(input);
  const launched = { ...input, launchRpm: launch.rpm };
  const target = input.knownSixtyFtS;

  if (target === null || !(target > 0)) {
    return {
      ...simulateQuarterMile(launched),
      launchRpm: launch.rpm,
      sixtyFtSource: input.automatic ? "estimate" : "best",
      launchScale: 1,
    };
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

/** Air density relative to standard (ISA sea level) at a density altitude in feet. */
export function densityRatioAtAltitude(densityAltitudeFt: number): number {
  return Math.max(1 - 6.8755856e-6 * densityAltitudeFt, 0.05) ** 4.2558797;
}

/**
 * Density altitude (ft) and density ratio from weather: temperature (°F), station barometer (inHg,
 * uncorrected) and relative humidity (%). Moist air is lighter: density = dry-air part + water-vapor part.
 */
export function densityFromWeather(tempF: number, baroInHg: number, humidityPct: number) {
  const tempC = ((tempF - 32) * 5) / 9;
  const tempK = tempC + 273.15;
  const saturationHpa = 6.1078 * 10 ** ((7.5 * tempC) / (tempC + 237.3));
  const vaporHpa = (Math.min(Math.max(humidityPct, 0), 100) / 100) * saturationHpa;
  const pressureHpa = baroInHg * 33.8638866667;
  const density = ((pressureHpa - vaporHpa) * 100) / (287.058 * tempK) + (vaporHpa * 100) / (461.495 * tempK);
  const ratio = density / 1.225;
  const densityAltitudeFt = 145442.16 * (1 - ratio ** 0.234969);
  return { densityAltitudeFt, ratio };
}

/** Engine torque scaled by air density (naturally aspirated: power follows the air it breathes). */
export function airCorrectedCurve(curve: PowerCurve, ratio: number): PowerCurve {
  return ratio === 1 ? curve : curve.map((p) => ({ ...p, torque: p.torque * ratio }));
}

export const SHIFT_SEARCH_STEP = 50;

/**
 * Shift rpm (a multiple of 50) that gives the quickest ET for this car, searched from the power peak
 * to the end of the power curve (torque past the curve's end is unknown). Launch rpm and any known-60 ft
 * fit are taken from one full run and held, so only the shift point changes.
 */
export function bestShiftRpm(input: RunInput & { knownSixtyFtS: number | null }): number {
  const step = SHIFT_SEARCH_STEP;
  const peak = curvePeaks(input.curve).hp.rpm;
  const low = Math.ceil(peak / step) * step;
  const high = Math.floor(input.curve[input.curve.length - 1].rpm / step) * step;
  if (high <= low) return Math.round(peak / step) * step;
  const base = runQuarterMile({ ...input, shiftRpm: high });
  let best = { rpm: low, et: Infinity };
  for (let rpm = low; rpm <= high; rpm += step) {
    const et = simulateQuarterMile({ ...input, shiftRpm: rpm, launchRpm: base.launchRpm, launchScale: base.launchScale }).et ?? Infinity;
    // Ties (within 0.1 ms) go to the lower rpm.
    if (et < best.et - 1e-4) best = { rpm, et };
  }
  return best.rpm;
}

// ---------------------------------------------------------------- comparing runs

/**
 * Where a run is at a timing-slip time, for the pass replay: distance, speed, rpm and gear,
 * interpolated between samples. Before the clock starts the car sits at the start; past the finish
 * it keeps rolling at its finish-line speed (cars that didn't finish stop where the run ended).
 */
export function stateAtTime(run: RunResult, t: number): { ft: number; mph: number; rpm: number; gear: number; finished: boolean } {
  const samples = run.samples;
  if (samples.length === 0) return { ft: 0, mph: 0, rpm: 0, gear: 0, finished: false };
  const finish = run.splits.find((s) => s.ft === QUARTER_FT);
  const last = samples[samples.length - 1];
  if (run.et !== null && t >= run.et) {
    const mph = finish?.mph ?? last.mph;
    return { ft: QUARTER_FT + ((mph * 5280) / 3600) * (t - run.et), mph, rpm: last.rpm, gear: last.gear, finished: true };
  }
  if (t <= samples[0].t) return { ft: samples[0].ft, mph: samples[0].mph, rpm: samples[0].rpm, gear: samples[0].gear, finished: false };
  if (t >= last.t) {
    // Between the last sample and the finish line.
    if (run.et === null || !finish) return { ft: last.ft, mph: last.mph, rpm: last.rpm, gear: last.gear, finished: false };
    const f = (t - last.t) / (run.et - last.t);
    return { ft: last.ft + f * (QUARTER_FT - last.ft), mph: last.mph + f * (finish.mph - last.mph), rpm: last.rpm, gear: last.gear, finished: false };
  }
  const i = samples.findIndex((s) => s.t >= t);
  const a = samples[i - 1];
  const b = samples[i];
  const f = (t - a.t) / (b.t - a.t);
  return { ft: a.ft + f * (b.ft - a.ft), mph: a.mph + f * (b.mph - a.mph), rpm: a.rpm + f * (b.rpm - a.rpm), gear: f < 1 ? a.gear : b.gear, finished: false };
}

/** Distance (ft) at a timing-slip time (s), interpolated between samples. */
export function ftAtTime(run: RunResult, t: number): number | null {
  const points = [...run.samples.map((s) => ({ ft: s.ft, t: s.t })), ...run.splits.map((s) => ({ ft: s.ft, t: s.t }))].sort((a, b) => a.t - b.t);
  if (points.length === 0 || t > points[points.length - 1].t) return null;
  if (t <= points[0].t) return points[0].ft;
  const i = points.findIndex((p) => p.t >= t);
  const a = points[i - 1];
  const b = points[i];
  return b.t === a.t ? b.ft : a.ft + ((t - a.t) / (b.t - a.t)) * (b.ft - a.ft);
}

/** How far behind `leader` this car is (ft) when the leader crosses the finish line, or null. */
export function marginFt(run: RunResult, leader: RunResult): number | null {
  if (leader.et === null) return null;
  const at = ftAtTime(run, leader.et);
  return at === null ? null : QUARTER_FT - at;
}
