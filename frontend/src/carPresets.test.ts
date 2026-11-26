import { describe, expect, it } from "vitest";
import { CAR_PRESETS, matchingPreset, presetPatch } from "./carPresets";
import { DEFAULT_VEHICLE } from "./quarterMile";

const ADVANCED = ["driveWeightFraction", "cgHeightIn", "wheelbaseIn", "dragCoefficient", "frontalAreaFt2"].sort();

describe("car presets", () => {
  it("has the six bodies with values inside the Advanced field limits", () => {
    expect(CAR_PRESETS.map((p) => p.id)).toEqual(["truck", "c6", "mustang", "muscle", "pony", "dragster"]);
    for (const p of CAR_PRESETS) {
      expect(p.rearWeightFraction).toBeGreaterThanOrEqual(0.1);
      expect(p.rearWeightFraction).toBeLessThanOrEqual(0.9);
      expect(p.cgHeightIn).toBeGreaterThanOrEqual(5);
      expect(p.cgHeightIn).toBeLessThanOrEqual(60);
      expect(p.wheelbaseIn).toBeGreaterThanOrEqual(60);
      expect(p.wheelbaseIn).toBeLessThanOrEqual(400);
      expect(p.dragCoefficient).toBeGreaterThanOrEqual(0.1);
      expect(p.dragCoefficient).toBeLessThanOrEqual(1.5);
      expect(p.frontalAreaFt2).toBeGreaterThanOrEqual(5);
      expect(p.frontalAreaFt2).toBeLessThanOrEqual(80);
      expect(p.wheels).toHaveLength(2);
    }
  });

  it("only touches the Advanced fields", () => {
    for (const p of CAR_PRESETS) expect(Object.keys(presetPatch(p, "rear")).sort()).toEqual(ADVANCED);
  });

  it("puts the front share on the driven axle for front-drive cars", () => {
    const c6 = CAR_PRESETS.find((p) => p.id === "c6")!;
    expect(presetPatch(c6, "rear").driveWeightFraction).toBe(0.49);
    expect(presetPatch(c6, "front").driveWeightFraction).toBe(0.51);
  });

  it("recognises a car that matches a preset, and stops when a field is edited", () => {
    const pony = CAR_PRESETS.find((p) => p.id === "pony")!;
    const car = { ...DEFAULT_VEHICLE, ...presetPatch(pony, "rear") };
    expect(matchingPreset(car)?.id).toBe("pony");
    expect(matchingPreset({ ...car, frontalAreaFt2: 22 })).toBeUndefined();
    expect(matchingPreset(DEFAULT_VEHICLE)).toBeUndefined();
  });
});
