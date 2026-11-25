import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, embedSettings, parseSettings, SETTINGS_ELEMENT_ID } from "./appState";

describe("parseSettings", () => {
  it("returns defaults for missing or non-object input", () => {
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("nope")).toEqual(DEFAULT_SETTINGS);
  });

  it("takes valid fields, keeps defaults for bad ones, drops unknown ones", () => {
    const settings = parseSettings({
      axleRatio: 4.56,
      shiftRpm: "7000",
      appMode: "crawl",
      rpmMode: "sideways",
      bogus: 1,
      power: { method: "dyno", dynoBasis: "wheel", trapMph: Number.NaN, peak: { peakHp: 500 } },
      vehicle: { weightLb: 3200, knownSixtyFtS: 1.85, drive: "awd" },
    });
    expect(settings.axleRatio).toBe(4.56);
    expect(settings.shiftRpm).toBe(DEFAULT_SETTINGS.shiftRpm);
    expect(settings.appMode).toBe("crawl");
    expect(settings.rpmMode).toBe(DEFAULT_SETTINGS.rpmMode);
    expect("bogus" in settings).toBe(false);
    expect(settings.power.method).toBe("dyno");
    expect(settings.power.dynoBasis).toBe("wheel");
    expect(settings.power.trapMph).toBe(DEFAULT_SETTINGS.power.trapMph);
    expect(settings.power.peak).toEqual({ ...DEFAULT_SETTINGS.power.peak, peakHp: 500 });
    expect(settings.vehicle).toEqual({ ...DEFAULT_SETTINGS.vehicle, weightLb: 3200, knownSixtyFtS: 1.85, drive: "awd" });
  });

  it("accepts a dyno table only if it has three valid rows", () => {
    const rows = [
      { rpm: 3000, torque: 300 },
      { rpm: 4000, torque: 350 },
      { rpm: 5000, torque: 320, extra: true },
    ];
    expect(parseSettings({ power: { dyno: rows } }).power.dyno).toEqual(rows.map(({ rpm, torque }) => ({ rpm, torque })));
    expect(parseSettings({ power: { dyno: rows.slice(0, 2) } }).power.dyno).toEqual(DEFAULT_SETTINGS.power.dyno);
  });

  it("round-trips through JSON", () => {
    const changed = { ...DEFAULT_SETTINGS, query: "t56", vehicle: { ...DEFAULT_SETTINGS.vehicle, knownSixtyFtS: 2.05 } };
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
    const html = embedSettings(page, { ...DEFAULT_SETTINGS, query: "</script><b>x" });
    const json = html.slice(html.indexOf(`id="${SETTINGS_ELEMENT_ID}">`) + SETTINGS_ELEMENT_ID.length + 6, html.lastIndexOf("</script>"));
    expect(json).not.toContain("<");
    expect(parseSettings(JSON.parse(json)).query).toBe("</script><b>x");
  });
});
