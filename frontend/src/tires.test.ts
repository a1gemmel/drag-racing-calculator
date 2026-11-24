import { describe, expect, it } from "vitest";
import { parseTireSize, ROLLING_DIAMETER_FACTOR } from "./tires";

describe("parseTireSize", () => {
  it("computes metric sizes from width, aspect and rim", () => {
    const tire = parseTireSize("275/55R15");
    expect(tire?.label).toBe("275/55R15");
    // 15 + 2 * (275 * 0.55 / 25.4) = 26.91
    expect(tire?.nominalDiameterIn).toBeCloseTo(26.91, 2);
    expect(tire?.effectiveDiameterIn).toBeCloseTo(26.91 * ROLLING_DIAMETER_FACTOR, 2);
  });

  it("accepts common metric spellings", () => {
    for (const input of ["P275/55R15", "275/55ZR15", "275 / 55 R 15", "275/55-15", "lt275/55r15 120S"]) {
      expect(parseTireSize(input)?.nominalDiameterIn, input).toBeCloseTo(26.91, 2);
    }
    expect(parseTireSize("LT285/70R17")?.label).toBe("LT285/70R17");
  });

  it("uses the rated height of flotation sizes", () => {
    const tire = parseTireSize("35x12.50R17");
    expect(tire?.nominalDiameterIn).toBe(35);
    expect(tire?.effectiveDiameterIn).toBeCloseTo(35 * ROLLING_DIAMETER_FACTOR, 5);
    expect(parseTireSize("33X12.5-15")?.label).toBe("33x12.5R15");
  });

  it("rejects text that is not a tire size", () => {
    for (const input of ["", "26", "275/55", "abc", "275/55R5", "99x12.50R17"]) {
      expect(parseTireSize(input), input).toBeNull();
    }
  });
});
