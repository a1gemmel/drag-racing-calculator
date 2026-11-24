import { describe, expect, it } from "vitest";
import { estimateFromTrap } from "./power";
import { bestLaunchRpm, DEFAULT_VEHICLE, runQuarterMile, simulateQuarterMile, type RunInput } from "./quarterMile";

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

  it("warns when traction-limited or too slow to finish", () => {
    expect(simulateQuarterMile({ ...base, grip: 0.4 }).warnings.join(" ")).toMatch(/Traction-limited/);
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

  it("isn't capped by engine inertia while the launch clutch slips", () => {
    // With plenty of grip, launch acceleration is limited by torque at launch RPM, and should exceed 0.9 g.
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
      expect(best.sixty).toBeLessThanOrEqual(sixty + 0.001); // the search keeps the lower RPM within 1 ms
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
