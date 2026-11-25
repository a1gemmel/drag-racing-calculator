import { GENERIC_AUTOMATIC, type AutomaticSetup } from "./automatic";
import { MAX_GEARS, type CustomTransmission } from "./customTransmissions";
import { DEFAULT_POWER, type PowerState } from "./power";
import { DEFAULT_VEHICLE, type VehicleSetup } from "./quarterMile";
import { ALL_SCOPE } from "./transmissionSearch";

/**
 * Everything on the page a user can set. A downloaded offline copy embeds the settings that were on
 * screen (as JSON in a <script type="application/json"> tag), and the app starts from them.
 */
export type AppSettings = {
  query: string;
  scope: string;
  selectedModel: string;
  selectedVariantName: string;
  tireMode: "diameter" | "size";
  tireDiameterIn: number;
  tireSize: string;
  axleRatio: number;
  rpmMode: "shift" | "range";
  shiftRpm: number;
  minRpm: number;
  maxRpm: number;
  gearsetView: "ladder" | "cruising";
  power: PowerState;
  vehicle: VehicleSetup;
  /** User-made transmissions. */
  customTransmissions: CustomTransmission[];
  /** Automatic settings the user changed, by transmission model; others use the transmission's defaults. */
  autoSetups: Record<string, AutomaticSetup>;
};

export const DEFAULT_SETTINGS: AppSettings = {
  query: "",
  scope: ALL_SCOPE,
  selectedModel: "Muncie M20",
  selectedVariantName: "66-70 Wide Ratio",
  tireMode: "diameter",
  tireDiameterIn: 26,
  tireSize: "275/55R15",
  axleRatio: 3.73,
  rpmMode: "shift",
  shiftRpm: 6500,
  minRpm: 1500,
  maxRpm: 6500,
  gearsetView: "cruising",
  power: DEFAULT_POWER,
  vehicle: DEFAULT_VEHICLE,
  customTransmissions: [],
  autoSetups: {},
};

export const SETTINGS_ELEMENT_ID = "saved-settings";

// Allowed values for string fields that are really enums, by dotted path.
const ENUMS: Record<string, readonly string[]> = {
  tireMode: ["diameter", "size"],
  rpmMode: ["shift", "range"],
  gearsetView: ["ladder", "cruising"],
  "power.method": ["trap", "peak", "dyno"],
  "power.peakBasis": ["crank", "wheel"],
  "power.dynoBasis": ["crank", "wheel"],
  "vehicle.drive": ["rear", "front", "awd"],
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
    } else if (typeof fallback === "string") {
      if (typeof value === "string" && (!ENUMS[at] || ENUMS[at].includes(value))) result[key] = value;
    } else if (fallback === null) {
      // Nullable numbers (e.g. a known 60 ft that's off by default).
      if (value === null || (typeof value === "number" && Number.isFinite(value))) result[key] = value;
    } else if (Array.isArray(fallback)) {
      // Only array in settings is the dyno table: rows of { rpm, torque }.
      if (Array.isArray(value)) {
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

export function parseSettings(raw: unknown): AppSettings {
  // The vehicle's knownSixtyFtS defaults to null, so it's handled by the nullable branch.
  const settings = mergeInto(DEFAULT_SETTINGS, raw);
  const source = isObject(raw) ? raw : {};
  return {
    ...settings,
    customTransmissions: parseCustoms(source.customTransmissions),
    autoSetups: parseAutoSetups(source.autoSetups),
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
