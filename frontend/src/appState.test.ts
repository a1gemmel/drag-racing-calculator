import { describe, expect, it } from "vitest";
import { DEFAULT_CAR, DEFAULT_CONDITIONS, DEFAULT_SETTINGS, embedSettings, MAX_CARS, parseSettings, SETTINGS_ELEMENT_ID } from "./appState";

/** The first car of settings saved in the pre-v0.5.0 single-car shape. */
const car0 = (raw: unknown) => parseSettings(raw).cars[0];

describe("parseSettings", () => {
  it("returns defaults for missing or non-object input", () => {
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("nope")).toEqual(DEFAULT_SETTINGS);
  });

  it("takes valid fields, keeps defaults for bad ones, drops unknown ones", () => {
    const settings = parseSettings({
      axleRatio: 4.56,
      shiftRpm: "7000",
      gearsetView: "ladder",
      tireMode: "sideways",
      rpmMode: "range",
      chartView: "full",
      bogus: 1,
      power: { method: "dyno", dynoBasis: "wheel", trapMph: Number.NaN, trapDistance: "sixteenth", trapEighthMph: 91, peak: { peakHp: 500 } },
      vehicle: { weightLb: 3200, knownSixtyFtS: 1.85, drive: "awd" },
    });
    const car = settings.cars[0];
    expect(car.axleRatio).toBe(4.56);
    expect(car.shiftRpm).toBe(DEFAULT_CAR.shiftRpm);
    expect(settings.gearsetView).toBe("ladder");
    expect(car.tireMode).toBe(DEFAULT_CAR.tireMode);
    expect("rpmMode" in car).toBe(false);
    expect(settings.chartView).toBe("full");
    expect("bogus" in car).toBe(false);
    expect(car.power.method).toBe("dyno");
    expect(car.power.dynoBasis).toBe("wheel");
    expect(car.power.trapMph).toBe(DEFAULT_CAR.power.trapMph);
    expect(car.power.trapDistance).toBe("quarter");
    expect(car.power.trapEighthMph).toBe(91);
    expect(car.power.peak).toEqual({ ...DEFAULT_CAR.power.peak, peakHp: 500 });
    expect(car.vehicle).toEqual({ ...DEFAULT_CAR.vehicle, weightLb: 3200, knownSixtyFtS: 1.85, drive: "awd" });
  });

  it("accepts a dyno table only if it has three valid rows", () => {
    const rows = [
      { rpm: 3000, torque: 300 },
      { rpm: 4000, torque: 350 },
      { rpm: 5000, torque: 320, extra: true },
    ];
    expect(car0({ power: { dyno: rows } }).power.dyno).toEqual(rows.map(({ rpm, torque }) => ({ rpm, torque })));
    expect(car0({ power: { dyno: rows.slice(0, 2) } }).power.dyno).toEqual(DEFAULT_CAR.power.dyno);
  });

  it("round-trips through JSON", () => {
    const changed = {
      ...DEFAULT_SETTINGS,
      cars: [DEFAULT_CAR, { ...DEFAULT_CAR, name: "4.10s", query: "t56", axleRatio: 4.1, vehicle: { ...DEFAULT_CAR.vehicle, knownSixtyFtS: 2.05, launchControl: true } }],
      activeCar: 1,
      conditions: { ...DEFAULT_CONDITIONS, mode: "weather" as const, tempF: 88 },
    };
    expect(parseSettings(JSON.parse(JSON.stringify(changed)))).toEqual(changed);
  });
});

describe("embedSettings", () => {
  // Like the real page: the inline script mentions "</head>" before the real closing tag.
  const page = '<!doctype html>\n<html><head><script type="module">const s="</head>";</script></head><body><div id="root"></div></body></html>';

  it("inserts the settings before the real </head>", () => {
    const html = embedSettings(page, DEFAULT_SETTINGS);
    expect(html.startsWith('<!doctype html>\n<html><head><script type="module">const s="</head>";</script><script type="application/json"')).toBe(true);
    expect(html.endsWith("</head><body><div id=\"root\"></div></body></html>")).toBe(true);
  });

  it("escapes < so a value can't close the tag", () => {
    const html = embedSettings(page, { ...DEFAULT_SETTINGS, cars: [{ ...DEFAULT_CAR, query: "</script><b>x" }] });
    const json = html.slice(html.indexOf(`id="${SETTINGS_ELEMENT_ID}">`) + SETTINGS_ELEMENT_ID.length + 6, html.lastIndexOf("</script>"));
    expect(json).not.toContain("<");
    expect(parseSettings(JSON.parse(json)).cars[0].query).toBe("</script><b>x");
  });
});

describe("saved custom transmissions and automatic settings", () => {
  it("keeps valid customs and drops malformed or duplicate ones", () => {
    const settings = parseSettings({
      customTransmissions: [
        { name: "Glide 1.80", kind: "automatic", ratios: [1.8, 1.0], automatic: { stallRpm: 4200, lockup: "sideways" } },
        { name: "glide 1.80", kind: "manual", ratios: [2, 1] },
        { name: "Bad", kind: "manual", ratios: [2, -1] },
        { name: "", ratios: [2] },
        "nope",
      ],
    });
    expect(settings.customTransmissions.map((c) => c.name)).toEqual(["Glide 1.80"]);
    expect(settings.customTransmissions[0].automatic?.stallRpm).toBe(4200);
    expect(settings.customTransmissions[0].automatic?.lockup).toBe("off");
  });

  it("keeps per-transmission automatic settings, filling gaps with defaults", () => {
    const settings = car0({ autoSetups: { TH400: { stallRpm: 3800, launch: "footbrake" }, Junk: 5 } });
    expect(Object.keys(settings.autoSetups)).toEqual(["TH400"]);
    expect(settings.autoSetups.TH400.stallRpm).toBe(3800);
    expect(settings.autoSetups.TH400.launch).toBe("footbrake");
    expect(settings.autoSetups.TH400.stallTorqueRatio).toBe(2);
  });
});

describe("cars", () => {
  it("reads the single-car shape saved before v0.5.0 as one car", () => {
    const settings = parseSettings({ axleRatio: 4.11, gearsetView: "ladder", vehicle: { weightLb: 3300 } });
    expect(settings.cars).toEqual([{ ...DEFAULT_CAR, axleRatio: 4.11, vehicle: { ...DEFAULT_CAR.vehicle, weightLb: 3300 } }]);
    expect(settings.gearsetView).toBe("ladder");
    expect(settings.conditions).toEqual(DEFAULT_CONDITIONS);
  });

  it("names unnamed cars, caps the count and clamps the open tab", () => {
    const settings = parseSettings({ cars: Array.from({ length: 9 }, (_, i) => (i === 1 ? { name: "  Slicks  " } : {})), activeCar: 20 });
    expect(settings.cars).toHaveLength(MAX_CARS);
    expect(settings.cars.map((c) => c.name).slice(0, 3)).toEqual(["Car 1", "Slicks", "Car 3"]);
    expect(settings.activeCar).toBe(MAX_CARS - 1);
  });

  it("keeps booleans such as launch control and a missing lock-up clutch", () => {
    const settings = parseSettings({ cars: [{ vehicle: { launchControl: true }, autoSetups: { "4L80E": { lockupCapable: false } } }] });
    expect(settings.cars[0].vehicle.launchControl).toBe(true);
    expect(settings.cars[0].autoSetups["4L80E"].lockupCapable).toBe(false);
  });

  it("checks track conditions", () => {
    expect(parseSettings({ conditions: { mode: "da", densityAltitudeFt: 2500 } }).conditions).toEqual({ ...DEFAULT_CONDITIONS, mode: "da", densityAltitudeFt: 2500 });
    expect(parseSettings({ conditions: { mode: "moon" } }).conditions.mode).toBe("standard");
  });
});

describe("car colors", () => {
  it("keeps #rrggbb colors and drops anything else", () => {
    const settings = parseSettings({ cars: [{ color: "#FFAA00" }, { color: "red" }, { color: "#12345" }] });
    expect(settings.cars.map((c) => c.color)).toEqual(["#ffaa00", "", ""]);
    expect(parseSettings({ carColor: "#00ff00" }).cars[0].color).toBe("#00ff00");
  });
});

describe("simple mode settings", () => {
  it("defaults to auto with the simple defaults, and checks values", () => {
    expect(DEFAULT_SETTINGS.mode).toBe("auto");
    const settings = parseSettings({ mode: "simple", simple: { hp: 525, weightLb: "heavy", knownSixtyFtS: 1.7 } });
    expect(settings.mode).toBe("simple");
    expect(settings.simple).toEqual({ ...DEFAULT_SETTINGS.simple, hp: 525, knownSixtyFtS: 1.7 });
    expect(parseSettings({ mode: "tiny" }).mode).toBe("auto");
  });
});
