import { describe, expect, it } from "vitest";
import { buildCurve, DEFAULT_POWER } from "./power";
import { DEFAULT_VEHICLE, runQuarterMile } from "./quarterMile";
import { transmissionFamilies } from "./catalog";
import { DEFAULT_SIMPLE, simulateSimplePass } from "./simplePass";

const hale = (hp: number, lb: number) => 234 * (hp / lb) ** (1 / 3);

describe("simple pass", () => {
  it.each([
    [250, 3400, 0.9],
    [384, 3700, 1.0],
    [460, 4000, 1.0],
    [600, 3200, 1.3],
    [1000, 3000, 1.6],
  ])("traps within 1% of Hale's rule: %i hp, %i lb", (hp, weightLb, grip) => {
    const run = simulateSimplePass({ ...DEFAULT_SIMPLE, hp, weightLb, grip });
    expect(Math.abs(run.trapMph! / hale(hp, weightLb) - 1)).toBeLessThan(0.01);
  });

  it("lands close to the full mode's default car (same hp and weight)", () => {
    const full = runQuarterMile({
      ...DEFAULT_VEHICLE,
      curve: buildCurve(DEFAULT_POWER).curve!,
      gearRatios: transmissionFamilies.find((f) => f.model === "Muncie M20")!.variants[1].gear_ratios,
      axleRatio: 3.73,
      tireDiameterIn: 26,
      shiftRpm: 6500,
    });
    const crankHp = 3700 * (110 / 234) ** 3;
    const simple = simulateSimplePass({ ...DEFAULT_SIMPLE, hp: crankHp, weightLb: 3700 });
    expect(Math.abs(simple.et! - full.et!)).toBeLessThan(0.2);
    expect(Math.abs(simple.trapMph! - full.trapMph!)).toBeLessThan(1.5);
  });

  it("is quicker with more power or grip and slower with more weight", () => {
    const base = simulateSimplePass(DEFAULT_SIMPLE);
    expect(simulateSimplePass({ ...DEFAULT_SIMPLE, hp: 500 }).et!).toBeLessThan(base.et!);
    expect(simulateSimplePass({ ...DEFAULT_SIMPLE, grip: 1.3 }).splits[0].t).toBeLessThan(base.splits[0].t);
    expect(simulateSimplePass({ ...DEFAULT_SIMPLE, weightLb: 4200 }).et!).toBeGreaterThan(base.et!);
  });

  it("fits a known 60 ft and carries on from there", () => {
    const run = simulateSimplePass({ ...DEFAULT_SIMPLE, knownSixtyFtS: 1.9 });
    expect(run.sixtyFtSource).toBe("known");
    expect(run.splits[0].t).toBeCloseTo(1.9, 2);
    expect(run.et!).toBeLessThan(simulateSimplePass(DEFAULT_SIMPLE).et!);
    expect(run.shifts).toEqual([]);
  });
});
