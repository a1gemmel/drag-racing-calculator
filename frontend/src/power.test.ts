import { describe, expect, it } from "vitest";
import {
  buildCurve,
  curvePeaks,
  DEFAULT_POWER,
  estimateFromTrap,
  horsepower,
  hpFromTrap,
  normalizeCurve,
  parseDynoText,
  quarterTrapMph,
  synthesizeCurve,
  torqueAt,
} from "./power";

describe("torqueAt", () => {
  const curve = normalizeCurve([
    { rpm: 3000, torque: 400 },
    { rpm: 2000, torque: 300 },
    { rpm: 4000, torque: 380 },
  ]);

  it("interpolates linearly and holds the ends", () => {
    expect(torqueAt(curve, 2500)).toBe(350);
    expect(torqueAt(curve, 1000)).toBe(300);
    expect(torqueAt(curve, 9000)).toBe(380);
  });
});

describe("synthesizeCurve", () => {
  const input = { peakHp: 430, peakHpRpm: 5900, peakTorque: 424, peakTorqueRpm: 4600 };

  it("puts the peaks where they were asked for", () => {
    const { curve } = synthesizeCurve(input);
    expect(curve).not.toBeNull();
    const peaks = curvePeaks(curve!);
    expect(peaks.tq.rpm).toBe(4600);
    expect(peaks.tq.value).toBeCloseTo(424, 0);
    expect(peaks.hp.rpm).toBeGreaterThanOrEqual(5800);
    expect(peaks.hp.rpm).toBeLessThanOrEqual(6000);
    expect(peaks.hp.value).toBeCloseTo(430, -1);
  });

  it("rejects inconsistent peaks", () => {
    expect(synthesizeCurve({ ...input, peakTorqueRpm: 6000 }).error).toMatch(/lower RPM/);
    expect(synthesizeCurve({ ...input, peakHp: 600 }).error).toMatch(/more than the peak torque/);
    expect(synthesizeCurve({ ...input, peakHp: 0 }).error).toMatch(/positive/);
  });
});

describe("trap-speed estimate", () => {
  it("matches Hale's formula", () => {
    // 3,500 lb at 113.5 mph is about 400 hp.
    expect(hpFromTrap(3500, 113.5)).toBeCloseTo(399.4, 0);
  });

  it("builds a curve whose peak is the estimate", () => {
    const result = estimateFromTrap(3500, 113.5, 6000);
    expect(result.error).toBeNull();
    expect(curvePeaks(result.curve!).hp.value).toBeCloseTo(result.peakHp, -1);
  });
});

describe("parseDynoText", () => {
  const rows = [3000, 4000, 5000, 6000].map((rpm, i) => ({ rpm, torque: [380, 420, 410, 360][i] }));

  it("reads a CSV with a header in any column order", () => {
    const text = ["Engine Speed,HP,Torque", ...rows.map((r) => `${r.rpm},${horsepower(r.torque, r.rpm).toFixed(1)},${r.torque}`)].join("\n");
    const result = parseDynoText(text);
    expect(result.error).toBeNull();
    expect(result.points).toEqual(rows);
  });

  it("derives torque when only hp is given", () => {
    const text = ["rpm\twhp", ...rows.map((r) => `${r.rpm}\t${horsepower(r.torque, r.rpm)}`)].join("\n");
    expect(parseDynoText(text).points?.map((p) => Math.round(p.torque))).toEqual([380, 420, 410, 360]);
  });

  it("tells hp and torque apart without a header", () => {
    const text = rows.map((r) => `${r.rpm} ${horsepower(r.torque, r.rpm).toFixed(1)} ${r.torque}`).join("\n");
    const result = parseDynoText(text);
    expect(result.points?.map((p) => p.torque)).toEqual([380, 420, 410, 360]);
    expect(result.note).toMatch(/hp, torque/);
  });

  it("reads two bare columns as rpm and torque", () => {
    expect(parseDynoText(rows.map((r) => `${r.rpm},${r.torque}`).join("\n")).points).toEqual(rows);
  });

  it("explains what is wrong", () => {
    expect(parseDynoText("").error).toMatch(/Paste/);
    expect(parseDynoText("1000,200\n2000,300").error).toMatch(/three/);
    expect(parseDynoText("foo,bar\n1,2\n3,4\n5,6").error).toMatch(/RPM column/);
  });
});

describe("buildCurve", () => {
  it("reports the basis of each method", () => {
    expect(buildCurve({ ...DEFAULT_POWER, method: "trap" }).basis).toBe("crank");
    expect(buildCurve({ ...DEFAULT_POWER, method: "peak", peakBasis: "wheel" }).basis).toBe("wheel");
    expect(buildCurve({ ...DEFAULT_POWER, method: "dyno", dynoBasis: "crank", peakBasis: "wheel" }).basis).toBe("crank");
  });
});

describe("trap-speed weight", () => {
  it("uses the weight entered with the trap speed, not anything else", () => {
    const light = buildCurve({ ...DEFAULT_POWER, method: "trap", trapWeightLb: 3000 });
    const heavy = buildCurve({ ...DEFAULT_POWER, method: "trap", trapWeightLb: 4000 });
    const peak = (c: typeof light) => curvePeaks(c.curve!).hp.value;
    expect(peak(heavy) / peak(light)).toBeCloseTo(4000 / 3000, 2);
  });
});

describe("quarterTrapMph", () => {
  it("uses the 1/4-mile trap as entered, or scales a 1/8-mile trap by 1.25", () => {
    expect(quarterTrapMph({ ...DEFAULT_POWER, trapMph: 112 })).toBe(112);
    expect(quarterTrapMph({ ...DEFAULT_POWER, trapDistance: "eighth", trapEighthMph: 90 })).toBeCloseTo(112.5, 6);
    const eighth = buildCurve({ ...DEFAULT_POWER, trapDistance: "eighth", trapEighthMph: 88 });
    const quarter = buildCurve({ ...DEFAULT_POWER, trapMph: 110 });
    expect(eighth.curve).toEqual(quarter.curve);
  });
});
