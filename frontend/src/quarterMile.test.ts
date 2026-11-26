import { describe, expect, it } from "vitest";
import { buildCurve, DEFAULT_POWER, estimateFromTrap } from "./power";
import {
  airCorrectedCurve,
  bestLaunchRpm,
  bestShiftRpm,
  DEFAULT_VEHICLE,
  densityFromWeather,
  densityRatioAtAltitude,
  ftAtTime,
  marginFt,
  stateAtTime,
  runQuarterMile,
  simulateQuarterMile,
  type RunInput,
} from "./quarterMile";
import { transmissionFamilies } from "./catalog";
import { curvePeaks } from "./power";
import { BIAS_PLY_ROLLING, RADIAL_ROLLING } from "./tires";

const curve = estimateFromTrap(3500, 113.5, 6000).curve!; // ≈ 400 hp
const base: RunInput = {
  ...DEFAULT_VEHICLE,
  weightLb: 3500,
  curve,
  gearRatios: [3.27, 1.98, 1.34, 1.0, 0.72],
  axleRatio: 3.73,
  tireDiameterIn: 26,
  shiftRpm: 6500,
};

describe("simulateQuarterMile", () => {
  const run = simulateQuarterMile(base);

  it("produces a plausible run for a 400 hp, 3,500 lb car", () => {
    expect(run.finished).toBe(true);
    expect(run.et).toBeGreaterThan(12.5);
    expect(run.et).toBeLessThan(14);
    // The trap speed should land near the trap speed the power was estimated from.
    expect(Math.abs(run.trapMph! - 113.5) / 113.5).toBeLessThan(0.04);
    expect(run.splits.map((split) => split.label)).toEqual(["60 ft", "330 ft", "1/8 mile", "1,000 ft", "1/4 mile"]);
    expect(run.splits[0].t).toBeGreaterThan(1.8);
    expect(run.splits[0].t).toBeLessThan(2.8);
  });

  it("upshifts in order at the shift RPM", () => {
    expect(run.shifts.map((shift) => shift.toGear)).toEqual([1, 2, 3]);
    const mph = run.shifts.map((shift) => shift.mph);
    expect(mph).toEqual([...mph].sort((a, b) => a - b));
    expect(Math.max(...run.samples.filter((s) => !s.shifting).map((s) => s.rpm))).toBeLessThanOrEqual(6500 + 15);
  });

  it("responds to weight, power and grip in the right direction", () => {
    expect(simulateQuarterMile({ ...base, weightLb: 4000 }).et!).toBeGreaterThan(run.et!);
    const strong = estimateFromTrap(3500, 125, 6000).curve!;
    expect(simulateQuarterMile({ ...base, curve: strong }).et!).toBeLessThan(run.et!);
    const slick = simulateQuarterMile({ ...base, grip: 1.6 });
    expect(slick.splits[0].t).toBeLessThan(run.splits[0].t);
  });

  it("reports a run that doesn't finish", () => {
    const weak = simulateQuarterMile({ ...base, curve: curve.map((p) => ({ ...p, torque: 2 })) });
    expect(weak.finished).toBe(false);
    expect(weak.et).toBeNull();
  });

  it("applies drivetrain loss to crank curves only", () => {
    const wheel = simulateQuarterMile({ ...base, curveBasis: "wheel" });
    expect(wheel.et!).toBeLessThan(run.et!);
    expect(simulateQuarterMile({ ...base, curveBasis: "wheel", drivetrainLoss: 0.4 }).et).toBe(wheel.et);
    expect(simulateQuarterMile({ ...base, curveBasis: "crank", drivetrainLoss: 0 }).et).toBeCloseTo(wheel.et!, 6);
  });

  it("times splits and ET from rollout, not first movement", () => {
    const noRollout = simulateQuarterMile({ ...base, rolloutIn: 0 });
    const gain = noRollout.et! - run.et!;
    expect(gain).toBeGreaterThan(0.15);
    expect(gain).toBeLessThan(0.45);
    expect(noRollout.splits[0].t - run.splits[0].t).toBeCloseTo(gain, 6);
    expect(run.trapMph).toBeCloseTo(noRollout.trapMph!, 6);
    expect(run.samples[0].t).toBeGreaterThanOrEqual(0);
  });

  it("clutch grabs within the release time and pulls engine RPM down early", () => {
    const launch = simulateQuarterMile({ ...base, grip: 1.6, launchRpm: 5000, rolloutIn: 0 });
    const rpmAt = (t: number) => launch.samples.find((s) => s.t >= t)!.rpm;
    expect(rpmAt(0)).toBeCloseTo(5000, -2);
    expect(rpmAt(0.3)).toBeLessThan(4500);
    // After the dip, RPM climbs with road speed in 1st.
    const low = Math.min(...launch.samples.filter((s) => s.t < 1.5).map((s) => s.rpm));
    expect(rpmAt(1.5)).toBeGreaterThan(low + 500);
  });

  it("launch acceleration is not capped by engine inertia when grip allows", () => {
    const slick = simulateQuarterMile({ ...base, grip: 2.5, launchRpm: 4500 });
    const [a, b] = [slick.samples[0], slick.samples[5]];
    const g = (b.mph - a.mph) / 2.2369362921 / (b.t - a.t) / 9.80665;
    expect(g).toBeGreaterThan(0.9);
  });

  it("warns when the shift point is past the end of the curve", () => {
    expect(simulateQuarterMile({ ...base, shiftRpm: 8000 }).warnings.join(" ")).toMatch(/curve ends/);
  });
});

describe("runQuarterMile", () => {
  it("launches at the RPM that gives the best 60 ft", () => {
    const strong = { ...base, grip: 2.5 }; // engine-limited, so launch RPM matters
    const best = bestLaunchRpm(strong);
    for (const rpm of [1500, 3000, 4500, 6000]) {
      const sixty = simulateQuarterMile({ ...strong, launchRpm: rpm, stopAtFt: 60 }).splits[0].t;
      expect(best.sixty).toBeLessThanOrEqual(sixty + 0.005); // ties within 5 ms go to the torque-peak RPM
    }
    const run = runQuarterMile({ ...strong, knownSixtyFtS: null });
    expect(run.sixtyFtSource).toBe("best");
    expect(run.launchRpm).toBe(best.rpm);
    expect(run.splits[0].t).toBeCloseTo(best.sixty, 6);
  });

  it("fits a known 60 ft and carries it through the rest of the run", () => {
    const estimate = runQuarterMile({ ...base, knownSixtyFtS: null });
    const slower = runQuarterMile({ ...base, knownSixtyFtS: estimate.splits[0].t + 0.3 });
    const quicker = runQuarterMile({ ...base, knownSixtyFtS: estimate.splits[0].t - 0.3 });
    expect(slower.splits[0].t).toBeCloseTo(estimate.splits[0].t + 0.3, 2);
    expect(quicker.splits[0].t).toBeCloseTo(estimate.splits[0].t - 0.3, 2);
    expect(slower.et!).toBeGreaterThan(estimate.et!);
    expect(quicker.et!).toBeLessThan(estimate.et!);
    expect(slower.sixtyFtSource).toBe("known");
    expect(slower.warnings.join(" ")).not.toMatch(/not reachable/);
  });

  it("reports a known 60 ft it can't reach", () => {
    expect(runQuarterMile({ ...base, knownSixtyFtS: 0.5 }).warnings.join(" ")).toMatch(/not reachable/);
  });
});

describe("trap-speed power round trip", () => {
  it("traps within 2% of the entered trap speed at the same race weight", () => {
    const car = { ...DEFAULT_VEHICLE, gearRatios: [2.52, 1.88, 1.46, 1.0], axleRatio: 3.73, tireDiameterIn: 26, shiftRpm: 6500 };
    for (const [weightLb, trapMph] of [
      [3700, 100],
      [3700, 115],
      [3700, 125],
      [3000, 115],
      [4300, 115],
    ]) {
      const power = buildCurve({ ...DEFAULT_POWER, method: "trap", trapMph, trapWeightLb: weightLb });
      const run = runQuarterMile({ ...car, weightLb, knownSixtyFtS: null, curve: power.curve!, curveBasis: power.basis });
      expect(Math.abs(run.trapMph! - trapMph) / trapMph).toBeLessThan(0.02);
    }
  });
  it("runs a 1/8-mile trap close to the entered 1/8-mile speed", () => {
    const car = { ...DEFAULT_VEHICLE, gearRatios: [2.52, 1.88, 1.46, 1.0], axleRatio: 3.73, tireDiameterIn: 26, shiftRpm: 6500 };
    for (const [weightLb, trapEighthMph] of [
      [3700, 80],
      [3700, 92],
      [3000, 92],
    ]) {
      const power = buildCurve({ ...DEFAULT_POWER, method: "trap", trapDistance: "eighth", trapEighthMph, trapWeightLb: weightLb });
      const run = runQuarterMile({ ...car, weightLb, knownSixtyFtS: null, curve: power.curve!, curveBasis: power.basis });
      expect(Math.abs(run.eighth!.mph - trapEighthMph) / trapEighthMph).toBeLessThan(0.03);
    }
  });
});

describe("tire construction", () => {
  it("a bias-ply slick traps 0.4-1 mph slower than a radial at the same grip", () => {
    const car = { ...base, grip: 1.6 };
    const radial = simulateQuarterMile({ ...car, rollingResistance: RADIAL_ROLLING });
    const bias = simulateQuarterMile({ ...car, rollingResistance: BIAS_PLY_ROLLING });
    const loss = radial.trapMph! - bias.trapMph!;
    expect(loss).toBeGreaterThan(0.4);
    expect(loss).toBeLessThan(1);
    expect(DEFAULT_VEHICLE.rollingResistance).toBe(RADIAL_ROLLING);
  });
});

describe("launch control", () => {
  it("puts a stock 2018 Mustang GT where magazines ran it (11.83-11.98 @ 119)", () => {
    const tenSpeed = transmissionFamilies.find((f) => f.model === "10R80")!;
    const curve = buildCurve({ ...DEFAULT_POWER, method: "peak", peak: { peakHp: 460, peakHpRpm: 7000, peakTorque: 420, peakTorqueRpm: 4600 } }).curve!;
    const gt = { ...DEFAULT_VEHICLE, weightLb: 4000, curve, gearRatios: tenSpeed.variants[0].gear_ratios, axleRatio: 3.55, tireDiameterIn: 26.6, shiftRpm: 7400, automatic: tenSpeed.automatic };
    const without = runQuarterMile({ ...gt, launchControl: false });
    const withLc = runQuarterMile({ ...gt, launchControl: true });
    expect(withLc.et!).toBeGreaterThan(11.75);
    expect(withLc.et!).toBeLessThan(12.05);
    expect(withLc.trapMph!).toBeGreaterThan(117.5);
    expect(withLc.splits[0].t).toBeLessThan(without.splits[0].t - 0.15);
  });
});

describe("density altitude", () => {
  it("follows the standard atmosphere", () => {
    expect(densityRatioAtAltitude(0)).toBe(1);
    expect(densityRatioAtAltitude(1000)).toBeCloseTo(0.9711, 3);
    expect(densityRatioAtAltitude(5000)).toBeCloseTo(0.8617, 3);
  });

  it("works out from weather: standard day is 0 ft, hot and humid is higher", () => {
    expect(Math.abs(densityFromWeather(59, 29.92, 0).densityAltitudeFt)).toBeLessThan(50);
    const hot = densityFromWeather(90, 29.92, 0).densityAltitudeFt;
    expect(hot).toBeGreaterThan(1800);
    expect(densityFromWeather(90, 29.92, 80).densityAltitudeFt).toBeGreaterThan(hot);
  });

  it("slows the car about 1 mph per 1,000 ft", () => {
    const at = (ft: number) => {
      const ratio = densityRatioAtAltitude(ft);
      return simulateQuarterMile({ ...base, curve: airCorrectedCurve(base.curve, ratio), airDensityRatio: ratio });
    };
    const sea = at(0);
    const high = at(4000);
    expect(sea.trapMph! - high.trapMph!).toBeGreaterThan(2.5);
    expect(sea.trapMph! - high.trapMph!).toBeLessThan(6);
    expect(high.et!).toBeGreaterThan(sea.et!);
    expect(at(0).et).toBe(simulateQuarterMile(base).et);
  });
});

describe("auto shift point", () => {
  it("picks a multiple of 50 between peak power and the curve's end that's at least as quick as either end", () => {
    const input = { ...base, knownSixtyFtS: null };
    const started = performance.now();
    const rpm = bestShiftRpm(input);
    const elapsed = performance.now() - started;
    const peak = curvePeaks(base.curve).hp.rpm;
    const top = base.curve[base.curve.length - 1].rpm;
    expect(rpm % 50).toBe(0);
    expect(rpm).toBeGreaterThanOrEqual(Math.ceil(peak / 50) * 50);
    expect(rpm).toBeLessThanOrEqual(top);
    const et = (shiftRpm: number) => runQuarterMile({ ...input, shiftRpm }).et!;
    expect(et(rpm)).toBeLessThanOrEqual(et(Math.ceil(peak / 50) * 50) + 0.002);
    expect(et(rpm)).toBeLessThanOrEqual(et(Math.floor(top / 50) * 50) + 0.002);
    expect(elapsed).toBeLessThan(3000);
  });
});

describe("comparing runs", () => {
  const quick = simulateQuarterMile({ ...base, grip: 1.3 });
  const slow = simulateQuarterMile(base);

  it("reads distance at a time", () => {
    for (const split of quick.splits) expect(ftAtTime(quick, split.t)).toBeCloseTo(split.ft, 6);
    expect(ftAtTime(quick, quick.et! + 5)).toBeNull();
  });

  it("gives the replay state at any time: start, timing marks, finish", () => {
    expect(stateAtTime(quick, -1)).toMatchObject({ gear: 0, finished: false });
    expect(stateAtTime(quick, -1).ft).toBeLessThan(2);
    for (const split of quick.splits.slice(0, -1)) {
      const state = stateAtTime(quick, split.t);
      expect(Math.abs(state.ft - split.ft)).toBeLessThan(1.5);
      expect(Math.abs(state.mph - split.mph)).toBeLessThan(0.5);
    }
    expect(stateAtTime(quick, quick.et!)).toMatchObject({ ft: 1320, finished: true });
    // Past the finish it keeps rolling at its finish-line speed.
    const end = stateAtTime(quick, quick.et! + 1);
    expect(end.finished).toBe(true);
    expect(end.ft).toBeCloseTo(1320 + (quick.splits[quick.splits.length - 1].mph * 5280) / 3600, 6);
    expect(end.gear).toBe(quick.samples[quick.samples.length - 1].gear);
    // Distance never goes backwards.
    let previous = -Infinity;
    for (let t = 0; t <= quick.et!; t += 0.01) {
      const { ft } = stateAtTime(quick, t);
      expect(ft).toBeGreaterThanOrEqual(previous);
      previous = ft;
    }
  });

  it("gives the margin at the stripe in feet: about the slower car's speed times the ET gap", () => {
    const feet = marginFt(slow, quick)!;
    const estimate = ((slow.et! - quick.et!) * slow.trapMph! * 5280) / 3600;
    expect(feet).toBeGreaterThan(0);
    expect(Math.abs(feet - estimate) / estimate).toBeLessThan(0.05);
    expect(marginFt(quick, quick)).toBeCloseTo(0, 6);
  });
});
