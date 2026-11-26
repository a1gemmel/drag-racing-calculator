import { describe, expect, it } from "vitest";
import { DEFAULT_CAR, DEFAULT_CONDITIONS, DEFAULT_SETTINGS, type AppSettings } from "./appState";
import { GENERIC_AUTOMATIC } from "./automatic";
import { decodeTokenRaw, describeSchema, settingsFromToken, settingsToToken, TOKEN_SCHEMA, toTokenView } from "./shareToken";
import golden from "./shareToken.golden.json";
import v1Schema from "./shareToken.v1-schema.json";
import v050Schema from "./shareToken.v0.5.0-schema.json";

/** Frozen schema snapshots, one per release that added fields. Never edit; add one when a release adds fields. */
const SCHEMA_SNAPSHOTS = { "0.4.0 (v1)": v1Schema, "0.5.0": v050Schema } as Record<string, Record<string, unknown>[]>;

/**
 * FROZEN (shareToken.golden.json): tokens written by released versions and the complete setup each
 * must decode to, in the token's layout (toTokenView: first car at the top level, others in extraCars). Never edit or delete an entry, only add new ones (e.g. when a version adds fields);
 * a failure here means a change broke links people have already shared. Settings added after a
 * token was written aren't in its entry and may take any value.
 */
const GOLDEN_TOKENS = golden as { version: string; token: string; settings: Record<string, unknown> }[];

const b64 = (bytes: number[]) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const bytesOf = (token: string) => [...atob(token.replace(/-/g, "+").replace(/_/g, "/"))].map((c) => c.charCodeAt(0));

describe("share token forward compatibility", () => {
  it.each(GOLDEN_TOKENS)("still decodes the $version token $token", ({ token, settings }) => {
    expect(toTokenView(settingsFromToken(token)!)).toMatchObject(settings);
  });

  it.each(Object.entries(SCHEMA_SNAPSHOTS))("keeps every field of the frozen %s schema with the same id, kind and base", (_name, snapshot) => {
    const current = new Map(describeSchema().map((entry) => [entry.id as string, entry]));
    for (const old of snapshot) {
      const now = current.get(old.id as string);
      expect(now, `field ${old.id} (${old.path}) was removed; mark it retired instead`).toBeDefined();
      const { values: oldValues, path: _p, ...oldRest } = old;
      const { values: newValues, path: _q, retired: _r, ...newRest } = now as Record<string, unknown>;
      expect(newRest, `field ${old.id} (${old.path}) changed`).toEqual(oldRest);
      if (oldValues) expect((newValues as string[]).slice(0, (oldValues as string[]).length), `enum ${old.path} must be append-only`).toEqual(oldValues);
    }
  });

  it("never reuses an id within a message", () => {
    const ids = describeSchema().map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers every setting, so a new one can't be left out of links", () => {
    const leaves = (value: unknown, prefix: string): string[] =>
      typeof value === "object" && value !== null && !Array.isArray(value) && Object.keys(value).length
        ? Object.entries(value).flatMap(([key, v]) => leaves(v, prefix ? `${prefix}.${key}` : key))
        : [prefix];
    const paths = new Set(describeSchema().filter((e) => !e.retired).map((e) => e.path));
    for (const path of leaves(toTokenView(DEFAULT_SETTINGS), "")) expect(paths).toContain(path);
    // Every car setting also travels for the second car onward (search text and filter aren't part of a setup).
    const { query: _q, scope: _s, ...car } = DEFAULT_CAR;
    for (const path of leaves(car, "")) expect(paths).toContain(`extraCars.${path}`);
    for (const key of Object.keys(GENERIC_AUTOMATIC)) {
      expect(paths).toContain(`customTransmissions.automatic.${key}`);
      expect(paths).toContain(`autoSetups.${key}`);
      expect(paths).toContain(`extraCars.autoSetups.${key}`);
    }
  });

  it("skips fields and enum values it doesn't know (tokens from newer versions)", () => {
    const axle = bytesOf("ATGRBQ");
    // Field 99 (varint), field 100 (bytes "xyz"), field 101 (null), then tireMode with an unknown enum index 9.
    const extended = [...axle, 0x98, 0x06, 0x05, 0xa2, 0x06, 0x03, 0x78, 0x79, 0x7a, 0xab, 0x06, 0x18, 0x09];
    const settings = settingsFromToken(b64(extended));
    expect(settings?.cars[0]).toMatchObject({ axleRatio: 4.1, tireMode: "diameter" });
  });

  it("keeps golden tokens for a range of settings", () => {
    expect(GOLDEN_TOKENS.length).toBeGreaterThanOrEqual(7);
    expect(GOLDEN_TOKENS.slice(0, 4).map((g) => (g.settings as { selectedModel: string }).selectedModel)).toEqual(["Muncie M20", "Muncie M20", "TH400", "My 6-speed"]);
    expect(GOLDEN_TOKENS.some((g) => ((g.settings as { extraCars: unknown[] }).extraCars ?? []).length >= 2)).toBe(true);
  });

  it("rejects malformed tokens and unknown format versions", () => {
    expect(settingsFromToken("")).toBeNull();
    expect(settingsFromToken("not a token!")).toBeNull();
    expect(settingsFromToken(b64([2, 0x31, 0x91, 0x05]))).toBeNull();
    expect(settingsFromToken(b64([1, 0x2a, 0x40]))).toBeNull(); // string longer than the token
  });
});

describe("share token round trip", () => {
  it("round-trips the current settings, including several cars, odd numbers and text", () => {
    const first = {
      ...DEFAULT_CAR,
      name: "Mÿ böx — ½",
      selectedModel: "Box",
      tireDiameterIn: 0.1 + 0.2,
      axleRatio: -1.5e-9,
      shiftRpm: 1234567,
      vehicle: { ...DEFAULT_CAR.vehicle, knownSixtyFtS: 1.85, launchControl: true },
      autoSetups: { TH400: { ...GENERIC_AUTOMATIC, lockupCapable: false, lockup: "top" as const }, "8HP70": { ...GENERIC_AUTOMATIC } },
    };
    const settings: AppSettings = {
      ...DEFAULT_SETTINGS,
      cars: [
        { ...first, color: "#ffcc00" },
        { ...DEFAULT_CAR, name: "Car 2", axleRatio: 4.56 },
        { ...first, name: "Slicks", color: "#2255ff", vehicle: { ...first.vehicle, grip: 1.6 } },
      ],
      activeCar: 2,
      conditions: { mode: "weather", densityAltitudeFt: 1200, tempF: 91, baroInHg: 29.11, humidityPct: 63 },
      customTransmissions: [{ name: "Box", kind: "automatic", ratios: [2.8, 1.6, 1], automatic: { ...GENERIC_AUTOMATIC } }],
    };
    expect(settingsFromToken(settingsToToken(settings))).toEqual(settings);
  });

  it("drops search text and an invalid dyno table", () => {
    const settings: AppSettings = { ...DEFAULT_SETTINGS, cars: [{ ...DEFAULT_CAR, query: "t56", power: { ...DEFAULT_CAR.power, dyno: [] } }] };
    expect(settingsFromToken(settingsToToken(settings))).toEqual(DEFAULT_SETTINGS);
  });

  it("carries a known 60 ft being turned back off", () => {
    expect(decodeTokenRaw(settingsToToken({ ...DEFAULT_SETTINGS, cars: [{ ...DEFAULT_CAR, vehicle: { ...DEFAULT_CAR.vehicle, knownSixtyFtS: null } }] }))).toMatchObject({
      vehicle: { knownSixtyFtS: null },
    });
  });

  it("is short", () => {
    expect(settingsToToken({ ...DEFAULT_SETTINGS, cars: [{ ...DEFAULT_CAR, axleRatio: 4.1 }] }).length).toBeLessThanOrEqual(8);
  });

  it("defaults to standard air", () => {
    expect(settingsFromToken("ATGRBQ")?.conditions).toEqual(DEFAULT_CONDITIONS);
    expect(TOKEN_SCHEMA.length).toBeGreaterThan(0);
  });
});
