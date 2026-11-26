import { describe, expect, it } from "vitest";
import { buildCurve, DEFAULT_POWER, estimateFromTrap } from "./power";
import { bestLaunchRpm, DEFAULT_VEHICLE, runQuarterMile, simulateQuarterMile, type RunInput } from "./quarterMile";
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
