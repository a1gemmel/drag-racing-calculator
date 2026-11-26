import { describe, expect, it } from "vitest";
import { speedMph } from "./calculations";
import { transmissionFamilies } from "./catalog";
import { buildCurve, DEFAULT_POWER } from "./power";
import { DEFAULT_VEHICLE, runQuarterMile, topSpeed } from "./quarterMile";

const family = (model: string) => transmissionFamilies.find((f) => f.model === model)!;
const curve = buildCurve(DEFAULT_POWER).curve!;
const muncie = family("Muncie M20").variants[1].gear_ratios;
const car = { ...DEFAULT_VEHICLE, curve, curveBasis: "crank" as const, gearRatios: muncie, axleRatio: 3.73, tireDiameterIn: 26, shiftRpm: 6500 };
const peak = (peakHp: number) =>
  buildCurve({ ...DEFAULT_POWER, method: "peak", peak: { peakHp, peakHpRpm: 6450, peakTorque: peakHp * 0.95, peakTorqueRpm: 5150 } }).curve!;

describe("top speed", () => {
  it("is rpm-limited at the gearing speed when the gear runs out first", () => {
    const top = topSpeed(car)!;
    expect(top.limit).toBe("rpm");
    expect(top.gear).toBe(3);
    expect(top.mph).toBeCloseTo(speedMph(6500, 26, 1, 3.73), 1);
  });

  it("is drag-limited below the gearing speed with an overdrive", () => {
    const gears = family("T56").variants[0].gear_ratios;
    // Tall enough that 5th runs out of power before 6,500 rpm.
    const top = topSpeed({ ...car, gearRatios: gears, axleRatio: 3.42 })!;
    expect(top.limit).toBe("drag");
    expect(top.rpm).toBeLessThan(6500);
    expect(top.mph).toBeLessThan(speedMph(6500, 26, gears[4], 3.42));
    expect(top.mph).toBeGreaterThan(140);
  });

  it("rises with power and falls with drag and thinner air", () => {
    const gears = family("T56").variants[0].gear_ratios;
    const base = topSpeed({ ...car, gearRatios: gears })!.mph;
    expect(topSpeed({ ...car, gearRatios: gears, curve: curve.map((p) => ({ ...p, torque: p.torque * 1.3 })) })!.mph).toBeGreaterThan(base);
    expect(topSpeed({ ...car, gearRatios: gears, dragCoefficient: 0.45 })!.mph).toBeLessThan(base);
    expect(topSpeed({ ...car, gearRatios: gears, airDensityRatio: 0.8 })!.mph).toBeGreaterThan(base);
  });

  it("puts a C8 Stingray near its published 194 mph", () => {
    const top = topSpeed({
      ...car,
      curve: peak(495),
      gearRatios: family("TR-9080 DCT").variants[0].gear_ratios,
      dualClutch: true,
      axleRatio: 5.17,
      tireDiameterIn: 27.3,
      weightLb: 3650,
      dragCoefficient: 0.32,
      frontalAreaFt2: 21,
    })!;
    expect(top.limit).toBe("drag");
    expect(top.mph).toBeGreaterThan(180);
    expect(top.mph).toBeLessThan(205);
  });

  it("counts converter slip for unlocked automatics", () => {
    const th400 = family("TH400");
    const top = topSpeed({ ...car, gearRatios: th400.variants[0].gear_ratios, automatic: th400.automatic })!;
    expect(top.rpm).toBeGreaterThan(top.mph); // sanity: rpm is engine rpm
    const locked = topSpeed({ ...car, gearRatios: th400.variants[0].gear_ratios, automatic: { ...th400.automatic!, lockupCapable: true, lockup: "top" } })!;
    expect(locked.mph).toBeGreaterThan(top.mph);
  });

  it("matches the pass: the run holds the top-speed gear instead of upshifting into one that can't pull", () => {
    // So much drag that 4th and 5th can't pull past 3rd's top speed, which the car reaches within the 1/4.
    const gears = family("T56").variants[0].gear_ratios;
    const draggy = { ...car, gearRatios: gears, axleRatio: 5, dragCoefficient: 5, knownSixtyFtS: null };
    const top = topSpeed(draggy)!;
    expect(top.gear).toBe(2);
    const run = runQuarterMile(draggy);
    const last = run.samples[run.samples.length - 1];
    expect(run.shifts.length).toBe(top.gear);
    expect(last.gear).toBe(top.gear);
    expect(last.mph).toBeLessThanOrEqual(top.mph + 0.1);
    expect(last.mph).toBeGreaterThan(top.mph - 2);
  });
});
