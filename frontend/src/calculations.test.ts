import { describe, expect, it } from "vitest";
import { gearSpeeds, speedMph, totalRatio } from "./calculations";

describe("drivetrain calculations", () => {
  it("matches the representative first-gear case", () => {
    expect(speedMph(6000, 26, 3.27, 4.1)).toBeCloseTo(34.6, 1);
  });

  it("multiplies transfer cases as additional ratio stages", () => {
    expect(totalRatio(3.27, 4.1, [2, 1.5])).toBeCloseTo(40.221);
  });

  it("preserves configured gear order", () => {
    const results = gearSpeeds(6000, 26, { "1": 3.27, "2": 1.98 }, 4.1);

    expect(results.map((result) => result.gear)).toEqual(["1", "2"]);
    expect(results[0].speed_mph).toBeLessThan(results[1].speed_mph);
  });

  it("rejects non-positive ratios", () => {
    expect(() => totalRatio(0, 4.1)).toThrow(/positive/);
  });
});