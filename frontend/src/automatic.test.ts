import { describe, expect, it } from "vitest";
import { automaticDefaults, GENERIC_AUTOMATIC, launchRpm, lockedInGear } from "./automatic";
import { familyKind, transmissionFamilies } from "./catalog";
import { customFamily, customProblems } from "./customTransmissions";
import { buildCurve, DEFAULT_POWER, torqueAt } from "./power";
import { converterConstants, DEFAULT_VEHICLE, runQuarterMile, simulateQuarterMile } from "./quarterMile";
import { filterFamilies } from "./transmissionSearch";

const family = (model: string) => transmissionFamilies.find((f) => f.model === model)!;
const curve = buildCurve(DEFAULT_POWER).curve!;
const car = { ...DEFAULT_VEHICLE, curve, curveBasis: "crank" as const, axleRatio: 3.73, tireDiameterIn: 26, shiftRpm: 6500, knownSixtyFtS: null };
const th400 = family("TH400");
const AUTOMATICS = ["Powerglide", "TH350", "TH400", "C4", "C6", "4L60E", "4L80E", "8HP70", "8HP45", "727 TorqueFlite", "545RFE", "65RFE", "10R80", "8L90"];
const th400Run = (overrides = {}, vehicle = {}) =>
  runQuarterMile({ ...car, ...vehicle, gearRatios: th400.variants[0].gear_ratios, automatic: { ...th400.automatic!, ...overrides } });

describe("automatic catalog", () => {
  it("has every requested automatic with converter defaults", () => {
    for (const model of AUTOMATICS) {
      const f = family(model);
      expect(familyKind(f), model).toBe("automatic");
      expect(f.automatic, model).toBeDefined();
      expect(launchRpm(f.automatic!), model).toBeLessThanOrEqual(f.automatic!.stallRpm);
      if (!f.automatic!.lockupCapable) expect(f.automatic!.lockup, model).toBe("off");
    }
    expect(transmissionFamilies.filter((f) => familyKind(f) === "manual").every((f) => !f.automatic)).toBe(true);
  });

  it("can be filtered by type", () => {
    const autos = filterFamilies(transmissionFamilies, "kind:automatic", "");
    expect(autos.map((f) => f.model)).toEqual(AUTOMATICS);
    expect(filterFamilies(transmissionFamilies, "kind:manual", "th400")).toEqual([]);
  });
});

describe("automatic setup helpers", () => {
  it("ties launch rpms to stall and caps them there", () => {
    const setup = automaticDefaults({ stallRpm: 3600 });
    expect(setup.transbrakeRpm).toBe(3600);
    expect(setup.footbrakeRpm).toBe(2700);
    expect(launchRpm({ ...setup, transbrakeRpm: 5000 })).toBe(3600);
    expect(launchRpm({ ...setup, launch: "footbrake" })).toBe(2700);
  });

  it("locks up only in the gears the mode allows, and only with a lock-up clutch", () => {
    const setup = { ...GENERIC_AUTOMATIC, lockupCapable: true };
    expect([0, 1, 2, 3].map((g) => lockedInGear({ ...setup, lockup: "top" }, g, 4))).toEqual([false, false, false, true]);
    expect([0, 1, 2, 3].map((g) => lockedInGear({ ...setup, lockup: "after1st" }, g, 4))).toEqual([false, true, true, true]);
    expect(lockedInGear({ ...setup, lockupCapable: false, lockup: "top" }, 3, 4)).toBe(false);
  });
});

describe("torque converter simulation", () => {
  it("sizes the converter so the engine stalls at the stall speed", () => {
    const { k, couplingRatio } = converterConstants(th400.automatic!, curve, 6500);
    expect((th400.automatic!.stallRpm / k) ** 2).toBeCloseTo(torqueAt(curve, th400.automatic!.stallRpm), 6);
    expect(couplingRatio).toBeGreaterThanOrEqual(0.6);
    expect(couplingRatio).toBeLessThanOrEqual(0.95);
  });

  it("launches a trans-brake car at stall and the engine climbs from there", () => {
    const run = simulateQuarterMile({ ...car, rolloutIn: 0, launchRpm: 0, gearRatios: th400.variants[0].gear_ratios, automatic: th400.automatic });
    expect(run.samples[0].rpm).toBeCloseTo(th400.automatic!.stallRpm, -2);
    expect(run.samples.find((s) => s.t >= 1.5)!.rpm).toBeGreaterThan(th400.automatic!.stallRpm);
  });

  it("slips about the set amount at the finish, and not at all locked up", () => {
    const slipAtFinish = (run: ReturnType<typeof th400Run>) => {
      const last = run.samples[run.samples.length - 1];
      const lockedRpm = (last.mph * th400.variants[0].gear_ratios[last.gear] * 3.73 * 336) / 26;
      return 1 - lockedRpm / last.rpm;
    };
    expect(slipAtFinish(th400Run())).toBeGreaterThan(0.04);
    expect(slipAtFinish(th400Run())).toBeLessThan(0.09);
    expect(Math.abs(slipAtFinish(th400Run({ lockupCapable: true, lockup: "top" })))).toBeLessThan(0.005);
  });

  it("traps faster with a tighter converter", () => {
    expect(th400Run({ couplingSlip: 0.02 }).trapMph!).toBeGreaterThan(th400Run({ couplingSlip: 0.12 }).trapMph!);
  });

  it("is slower off the foot brake than the trans brake when the tires hook", () => {
    const grip = { grip: 1.6 };
    expect(th400Run({ launch: "footbrake" }, grip).splits[0].t).toBeGreaterThan(th400Run({}, grip).splits[0].t);
  });

  it("finishes every catalog automatic with a plausible ET", () => {
    for (const f of transmissionFamilies.filter((x) => familyKind(x) === "automatic")) {
      const run = runQuarterMile({ ...car, gearRatios: f.variants[0].gear_ratios, automatic: f.automatic });
      expect(run.finished, f.model).toBe(true);
      expect(run.et!, f.model).toBeGreaterThan(11.5);
      expect(run.et!, f.model).toBeLessThan(14.5);
      expect(run.sixtyFtSource, f.model).toBe("estimate");
    }
  });

  it("keeps driving through a power shift, less the shift loss", () => {
    const hp = family("8HP70");
    const run = (o = {}) =>
      simulateQuarterMile({ ...car, rolloutIn: 0, launchRpm: 0, gearRatios: hp.variants[0].gear_ratios, automatic: { ...hp.automatic!, ...o } });
    const base = run();
    const during = base.samples.filter((s, i) => s.shifting && i > 0 && s.gear >= 2);
    expect(during.length).toBeGreaterThan(0);
    for (const s of during) expect(s.mph).toBeGreaterThan(base.samples[base.samples.indexOf(s) - 1].mph);
    expect(run({ shiftLoss: 0.5 }).et!).toBeGreaterThan(base.et!);
  });

  it("puts the 8HP70 ahead of the 4L80E", () => {
    const run = (model: string) => runQuarterMile({ ...car, gearRatios: family(model).variants[0].gear_ratios, automatic: family(model).automatic });
    expect(run("8HP70").et!).toBeLessThan(run("4L80E").et!);
  });

  it("still fits a known 60 ft with an automatic", () => {
    const run = th400Run({}, { knownSixtyFtS: 1.95 });
    expect(run.splits[0].t).toBeCloseTo(1.95, 2);
  });
});

describe("custom transmissions", () => {
  const custom = { name: "Liberty 5", kind: "manual" as const, ratios: [2.5, 1.7, 1.25, 1.0, 0.8] };

  it("becomes a catalog-shaped family under Custom", () => {
    const f = customFamily(custom);
    expect(f.manufacturer).toBe("Custom");
    expect(f.variants[0].gear_ratios).toEqual(custom.ratios);
    expect(f.automatic).toBeUndefined();
    expect(customFamily({ ...custom, kind: "automatic" }).automatic).toEqual(GENERIC_AUTOMATIC);
  });

  it("reports what stops it from being saved", () => {
    expect(customProblems(custom, ["TH400"])).toEqual([]);
    expect(customProblems({ ...custom, name: " " }, [])).toContain("Name is required");
    expect(customProblems({ ...custom, name: "th400" }, ["TH400"])).toContain("Name is already used");
    expect(customProblems({ ...custom, ratios: [2, 0] }, [])).toContain("Ratios must be greater than 0");
    expect(customProblems({ ...custom, ratios: [] }, [])).toContain("1 to 10 gears");
  });
});
