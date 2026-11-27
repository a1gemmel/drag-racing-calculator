import { GENERIC_AUTOMATIC, type AutomaticSetup } from "./automatic";
import { MAX_GEARS, type CustomTransmission } from "./customTransmissions";
import { DEFAULT_POWER, type PowerState } from "./power";
import { CAR_PRESETS, presetPatch } from "./carPresets";
import { DEFAULT_VEHICLE, type VehicleSetup } from "./quarterMile";
import { DEFAULT_SIMPLE, type SimpleSetup } from "./simplePass";
import { ALL_SCOPE } from "./transmissionSearch";

/** One car's setup: a tab in the setup section. The quarter-mile simulation overlays every car. */
export type CarSetup = {
  /** Tab name; also the car's label in the simulation charts. */
  name: string;
  /** Chosen color (#rrggbb) for the car's tab and chart lines; "" = the palette color for its tab position. */
  color: string;
  /** Transmission search text and manufacturer filter (kept per car so a filter can't hide another car's pick). */
  query: string;
  scope: string;
  selectedModel: string;
  selectedVariantName: string;
  tireMode: "diameter" | "size";
  tireDiameterIn: number;
  tireSize: string;
  axleRatio: number;
  /** Upshift rpm (every gear, or only the top gear's limit when shiftByGear is on). */
  shiftRpm: number;
  /** Separate upshift rpm per gear. */
  shiftByGear: boolean;
  /** Per-gear upshift rpms (index 0 = 1-2); gears past the end use shiftRpm. Kept when shiftByGear is off. */
  gearShiftRpms: number[];
  power: PowerState;
  vehicle: VehicleSetup;
  /** Automatic settings the user changed, by transmission model; others use the transmission's defaults. */
  autoSetups: Record<string, AutomaticSetup>;
};

/** Air for the simulation: standard (no correction), a density altitude, or weather that gives one. */
export type TrackConditions = {
  mode: "standard" | "da" | "weather";
  densityAltitudeFt: number;
  tempF: number;
  /** Station (uncorrected) barometer, inHg. */
  baroInHg: number;
  humidityPct: number;
};

/**
 * Everything on the page a user can set. A downloaded offline copy embeds the settings that were on
 * screen (as JSON in a <script type="application/json"> tag), and the app starts from them.
 */
export type AppSettings = {
  cars: CarSetup[];
  /** Index of the car whose tab is open. */
  activeCar: number;
  gearsetView: "ladder" | "cruising";
  /** RPM vs road speed: gears from where each upshift lands, or each gear from 1,200 rpm (1st from launch). */
  chartView: "shifts" | "full";
  conditions: TrackConditions;
  /** User-made transmissions, shared by all cars. */
  customTransmissions: CustomTransmission[];
  /** Simple mode (phones): hp, weight, tires and 60 ft only. */
  simple: SimpleSetup;
  /** Which version of the page: "auto" picks simple on phones and full elsewhere (or the user's last choice). */
  mode: "auto" | "simple" | "full";
};

export const MAX_CARS = 6;
export const MAX_CAR_NAME = 24;

export const DEFAULT_CAR: CarSetup = {
  name: "Car 1",
  color: "",
  query: "",
  scope: ALL_SCOPE,
  selectedModel: "Muncie M20",
  selectedVariantName: "66-70 Wide Ratio",
  tireMode: "diameter",
  tireDiameterIn: 26,
  tireSize: "275/55R15",
  axleRatio: 3.73,
  shiftRpm: 6500,
  shiftByGear: false,
  gearShiftRpms: [],
  power: DEFAULT_POWER,
  // The default car is a classic muscle car: its Advanced fields (weight split, CG, wheelbase, aero) come from that preset.
  vehicle: { ...DEFAULT_VEHICLE, ...presetPatch(CAR_PRESETS.find((preset) => preset.id === "muscle")!, "rear") },
  autoSetups: {},
};

export const DEFAULT_CONDITIONS: TrackConditions = { mode: "standard", densityAltitudeFt: 0, tempF: 70, baroInHg: 29.92, humidityPct: 40 };

export const DEFAULT_SETTINGS: AppSettings = {
  cars: [DEFAULT_CAR],
  activeCar: 0,
  gearsetView: "cruising",
  chartView: "shifts",
  conditions: DEFAULT_CONDITIONS,
  customTransmissions: [],
  simple: DEFAULT_SIMPLE,
  mode: "auto",
};

export const SETTINGS_ELEMENT_ID = "saved-settings";

// Allowed values for string fields that are really enums, by dotted path.
const ENUMS: Record<string, readonly string[]> = {
  tireMode: ["diameter", "size"],
  gearsetView: ["ladder", "cruising"],
  chartView: ["shifts", "full"],
  "power.method": ["trap", "peak", "dyno"],
  "power.trapDistance": ["quarter", "eighth"],
  "power.peakBasis": ["crank", "wheel"],
  "power.dynoBasis": ["crank", "wheel"],
  "vehicle.drive": ["rear", "front", "awd"],
  "conditions.mode": ["standard", "da", "weather"],
  mode: ["auto", "simple", "full"],
  lockup: ["off", "top", "after1st"],
  launch: ["transbrake", "footbrake"],
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Takes each field from `raw` only if it has the same type as the default (and, for enums, an
 * allowed value); anything missing or malformed keeps its default. Unknown fields are dropped.
 */
function mergeInto<T>(defaults: T, raw: unknown, path = ""): T {
  if (!isObject(defaults) || !isObject(raw)) return defaults;
  const result: Record<string, unknown> = { ...defaults };
  for (const [key, fallback] of Object.entries(defaults)) {
    const value = raw[key];
    const at = path ? `${path}.${key}` : key;
    if (value === undefined) continue;
    if (typeof fallback === "number") {
      if (typeof value === "number" && Number.isFinite(value)) result[key] = value;
    } else if (typeof fallback === "boolean") {
      if (typeof value === "boolean") result[key] = value;
    } else if (typeof fallback === "string") {
      if (typeof value === "string" && (!ENUMS[at] || ENUMS[at].includes(value))) result[key] = value;
    } else if (fallback === null) {
      // Nullable numbers (e.g. a known 60 ft that's off by default).
      if (value === null || (typeof value === "number" && Number.isFinite(value))) result[key] = value;
    } else if (Array.isArray(fallback)) {
      if (key === "gearShiftRpms") {
        if (Array.isArray(value)) result[key] = value.filter((n) => typeof n === "number" && Number.isFinite(n) && n > 0).slice(0, 20);
      } else if (Array.isArray(value)) {
        // The other array in settings is the dyno table: rows of { rpm, torque }.
        const rows = value.filter(
          (row): row is { rpm: number; torque: number } =>
            isObject(row) && Number.isFinite(row.rpm) && Number.isFinite(row.torque),
        );
        if (rows.length >= 3) result[key] = rows.map(({ rpm, torque }) => ({ rpm, torque }));
      }
    } else if (isObject(fallback)) {
      result[key] = mergeInto(fallback, value, at);
    }
  }
  return result as T;
}

const carName = (raw: unknown, index: number) =>
  typeof raw === "string" && raw.trim() ? raw.trim().slice(0, MAX_CAR_NAME) : `Car ${index + 1}`;

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function parseCar(raw: unknown, index: number): CarSetup {
  const { name: _name, color: _color, autoSetups: _auto, ...fields } = DEFAULT_CAR;
  const source = isObject(raw) ? raw : {};
  return {
    name: carName(source.name, index),
    color: typeof source.color === "string" && HEX_COLOR.test(source.color) ? source.color.toLowerCase() : "",
    ...mergeInto(fields, source),
    autoSetups: parseAutoSetups(source.autoSetups),
  };
}

/**
 * Settings from saved JSON. Reads the current shape ({ cars: [...] }) and the single-car shape saved
 * before v0.5.0 (the car's fields at the top level, as share tokens still decode, with any further
 * cars in `extraCars` and the first car's name in `carName`).
 */
export function parseSettings(raw: unknown): AppSettings {
  const source = isObject(raw) ? raw : {};
  const rawCars = Array.isArray(source.cars) && source.cars.length
    ? source.cars
    : [{ ...source, name: source.carName, color: source.carColor }, ...(Array.isArray(source.extraCars) ? source.extraCars : [])];
  const cars = rawCars.slice(0, MAX_CARS).map(parseCar);
  const activeCar = typeof source.activeCar === "number" && Number.isInteger(source.activeCar) ? Math.min(Math.max(source.activeCar, 0), cars.length - 1) : 0;
  const views = mergeInto({ gearsetView: DEFAULT_SETTINGS.gearsetView, chartView: DEFAULT_SETTINGS.chartView, mode: DEFAULT_SETTINGS.mode }, source);
  return {
    cars,
    activeCar,
    ...views,
    conditions: mergeInto(DEFAULT_CONDITIONS, source.conditions, "conditions"),
    customTransmissions: parseCustoms(source.customTransmissions),
    simple: mergeInto(DEFAULT_SIMPLE, source.simple, "simple"),
  };
}

const parseAutoSetup = (raw: unknown, fallback: AutomaticSetup = GENERIC_AUTOMATIC): AutomaticSetup =>
  mergeInto<AutomaticSetup>(fallback, raw);

function parseCustoms(raw: unknown): CustomTransmission[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  return raw.flatMap((item): CustomTransmission[] => {
    if (!isObject(item) || typeof item.name !== "string" || !item.name.trim()) return [];
    const name = item.name.trim();
    if (seen.has(name.toLowerCase()) || name.includes("::")) return [];
    const ratios = Array.isArray(item.ratios) ? item.ratios : [];
    if (ratios.length < 1 || ratios.length > MAX_GEARS || !ratios.every((r) => typeof r === "number" && Number.isFinite(r) && r > 0)) return [];
    const kind = item.kind === "automatic" ? "automatic" : "manual";
    seen.add(name.toLowerCase());
    return [{ name, kind, ratios: ratios as number[], automatic: kind === "automatic" ? parseAutoSetup(item.automatic) : undefined }];
  });
}

function parseAutoSetups(raw: unknown): Record<string, AutomaticSetup> {
  if (!isObject(raw)) return {};
  return Object.fromEntries(Object.entries(raw).filter(([, value]) => isObject(value)).map(([model, value]) => [model, parseAutoSetup(value)]));
}

/** Settings embedded in the page by a previous download, or the defaults. */
export function readEmbeddedSettings(doc: Document): AppSettings {
  const text = doc.getElementById(SETTINGS_ELEMENT_ID)?.textContent;
  if (!text) return DEFAULT_SETTINGS;
  try {
    return parseSettings(JSON.parse(text));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * The page's HTML with `settings` embedded at the end of <head>. Pass HTML without previous settings
 * (offline.ts captures the page with them removed). The page's own inline script contains "</head>"
 * as text, so this inserts before the *last* one, which is the real tag. `<` in the JSON is escaped
 * so it can never close the script tag.
 */
export function embedSettings(html: string, settings: AppSettings): string {
  const json = JSON.stringify(settings).replace(/</g, "\\u003c");
  const tag = `<script type="application/json" id="${SETTINGS_ELEMENT_ID}">${json}</` + "script>\n";
  const headEnd = html.lastIndexOf("</head>");
  return headEnd === -1 ? tag + html : html.slice(0, headEnd) + tag + html.slice(headEnd);
}
