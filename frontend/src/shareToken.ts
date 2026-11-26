import { DEFAULT_SETTINGS, parseSettings, type AppSettings } from "./appState";

/**
 * Share tokens: the whole setup as one short URL-safe string (the page's URL fragment).
 *
 * FORWARD COMPATIBILITY IS A HARD REQUIREMENT: every token any released version wrote must keep
 * decoding to the same setup in every later version. The rules (also in AGENTS.md, guarded by
 * shareToken.test.ts and shareToken.v1-schema.json):
 *   - A field's id, kind and base never change, and an id is never reused. Enum value lists are
 *     append-only (a token stores the index).
 *   - New settings get a new id. Their base must be the value that reproduces how the app behaved
 *     before the setting existed, since older tokens don't carry it.
 *   - A removed setting stays in the schema with `retired: true` (still parsed, then ignored).
 *   - Bases are literals here, never references to app defaults: changing a default in the app must
 *     not change what an old token means.
 *   - The format version byte only changes for an incompatible format change, and then the decoder
 *     for every older version is kept.
 *
 * Format (version 1): base64url( 0x01, message ). A message is a sequence of fields, each
 * varint(id * 8 + wire) followed by its payload; only fields whose value differs from the field's base
 * are written, in any order, and unknown ids are skipped by wire type, so tokens from newer versions
 * still load what this version knows. Wire types:
 *   0 VARINT  enum index or boolean
 *   1 NUMBER  varint(zigzag(m) * 8 + e) for the decimal m / 10^e (e 0-6); e = 7 means a float64 follows
 *   2 BYTES   varint length + payload: UTF-8 string, nested message, list or map
 *   3 NULL    no payload
 * Lists are varint count + per element (varint length + message). Number lists are varint count +
 * NUMBER values. Maps are varint count + per entry (string key, varint length + message).
 */

export const TOKEN_FORMAT_VERSION = 1;

const WIRE = { varint: 0, number: 1, bytes: 2, null: 3 } as const;

type Field = { id: number; key: string; retired?: boolean } & (
  | { kind: "number"; base: number }
  | { kind: "nullableNumber"; base: number | null }
  | { kind: "string"; base: string }
  | { kind: "enum"; values: readonly string[]; base: string }
  | { kind: "boolean"; base: boolean }
  | { kind: "message"; fields: readonly Field[]; optional?: boolean }
  | { kind: "list"; element: readonly Field[]; base: readonly unknown[] }
  | { kind: "numbers"; base: readonly number[] }
  | { kind: "map"; value: readonly Field[] }
);

const num = (id: number, key: string, base: number): Field => ({ id, key, kind: "number", base });
const str = (id: number, key: string, base: string): Field => ({ id, key, kind: "string", base });
const enm = (id: number, key: string, values: readonly string[], base: string): Field => ({ id, key, kind: "enum", values, base });

const AUTOMATIC_FIELDS: readonly Field[] = [
  num(1, "stallRpm", 3000),
  num(2, "stallTorqueRatio", 2),
  num(3, "couplingSlip", 0.06),
  enm(4, "lockup", ["off", "top", "after1st"], "off"),
  { id: 5, key: "lockupCapable", kind: "boolean", base: true },
  enm(6, "launch", ["transbrake", "footbrake"], "transbrake"),
  num(7, "transbrakeRpm", 3000),
  num(8, "footbrakeRpm", 2200),
  num(9, "shiftTimeS", 0.2),
  num(10, "shiftLoss", 0.15),
  num(11, "drivetrainLoss", 0.13),
];

/** The token schema. Append only; see the rules above. */
export const TOKEN_SCHEMA: readonly Field[] = [
  str(1, "selectedModel", "Muncie M20"),
  str(2, "selectedVariantName", "66-70 Wide Ratio"),
  enm(3, "tireMode", ["diameter", "size"], "diameter"),
  num(4, "tireDiameterIn", 26),
  str(5, "tireSize", "275/55R15"),
  num(6, "axleRatio", 3.73),
  num(7, "shiftRpm", 6500),
  enm(8, "gearsetView", ["ladder", "cruising"], "cruising"),
  enm(9, "chartView", ["shifts", "full"], "shifts"),
  {
    id: 10,
    key: "power",
    kind: "message",
    fields: [
      enm(1, "method", ["trap", "peak", "dyno"], "trap"),
      enm(2, "trapDistance", ["quarter", "eighth"], "quarter"),
      num(3, "trapMph", 110),
      num(4, "trapEighthMph", 88),
      num(5, "trapWeightLb", 3700),
      num(6, "trapPeakRpm", 6000),
      {
        id: 7,
        key: "peak",
        kind: "message",
        fields: [num(1, "peakHp", 430), num(2, "peakHpRpm", 5900), num(3, "peakTorque", 424), num(4, "peakTorqueRpm", 4600)],
      },
      enm(8, "peakBasis", ["crank", "wheel"], "crank"),
      {
        id: 9,
        key: "dyno",
        kind: "list",
        element: [num(1, "rpm", 0), num(2, "torque", 0)],
        base: [
          { rpm: 2000, torque: 330 },
          { rpm: 3000, torque: 375 },
          { rpm: 4000, torque: 410 },
          { rpm: 4600, torque: 424 },
          { rpm: 5200, torque: 410 },
          { rpm: 5900, torque: 383 },
          { rpm: 6500, torque: 330 },
        ],
      },
      enm(10, "dynoBasis", ["crank", "wheel"], "crank"),
    ],
  },
  {
    id: 11,
    key: "vehicle",
    kind: "message",
    fields: [
      num(1, "weightLb", 3700),
      num(2, "drivetrainLoss", 0.11),
      num(3, "grip", 1),
      enm(4, "drive", ["rear", "front", "awd"], "rear"),
      num(5, "driveWeightFraction", 0.5),
      num(6, "cgHeightIn", 20),
      num(7, "wheelbaseIn", 105),
      num(8, "dragCoefficient", 0.35),
      num(9, "frontalAreaFt2", 22),
      num(10, "rollingResistance", 0.015),
      num(11, "shiftTimeS", 0.15),
      num(12, "launchRpm", 3500),
      num(13, "clutchReleaseS", 0.25),
      num(14, "rolloutIn", 11.5),
      { id: 15, key: "knownSixtyFtS", kind: "nullableNumber", base: null },
    ],
  },
  {
    id: 12,
    key: "customTransmissions",
    kind: "list",
    base: [],
    element: [
      str(1, "name", ""),
      enm(2, "kind", ["manual", "automatic"], "manual"),
      { id: 3, key: "ratios", kind: "numbers", base: [] },
      { id: 4, key: "automatic", kind: "message", optional: true, fields: AUTOMATIC_FIELDS },
    ],
  },
  { id: 13, key: "autoSetups", kind: "map", value: AUTOMATIC_FIELDS },
];

// ---------------------------------------------------------------- bytes

class Writer {
  bytes: number[] = [];
  varint(value: number) {
    let v = value;
    while (v >= 128) {
      this.bytes.push((v % 128) + 128);
      v = Math.floor(v / 128);
    }
    this.bytes.push(v);
  }
  number(value: number) {
    for (let e = 0; e <= 6; e++) {
      const m = Math.round(value * 10 ** e);
      if (Math.abs(m) < 2 ** 47 && m / 10 ** e === value) {
        this.varint((m >= 0 ? 2 * m : -2 * m - 1) * 8 + e);
        return;
      }
    }
    this.varint(7);
    const view = new DataView(new ArrayBuffer(8));
    view.setFloat64(0, value);
    for (let i = 0; i < 8; i++) this.bytes.push(view.getUint8(i));
  }
  chunk(bytes: number[]) {
    this.varint(bytes.length);
    this.bytes.push(...bytes);
  }
  tag(id: number, wire: number) {
    this.varint(id * 8 + wire);
  }
}

class Reader {
  pos = 0;
  constructor(private readonly bytes: Uint8Array, private readonly end = bytes.length) {}
  get done() {
    return this.pos >= this.end;
  }
  byte() {
    if (this.pos >= this.end) throw new Error("token ends early");
    return this.bytes[this.pos++];
  }
  varint() {
    let result = 0;
    let scale = 1;
    for (;;) {
      const b = this.byte();
      result += (b % 128) * scale;
      if (b < 128) return result;
      scale *= 128;
      if (scale > 2 ** 56) throw new Error("varint too long");
    }
  }
  number() {
    const v = this.varint();
    const e = v % 8;
    if (e === 7) {
      const view = new DataView(new ArrayBuffer(8));
      for (let i = 0; i < 8; i++) view.setUint8(i, this.byte());
      return view.getFloat64(0);
    }
    const z = Math.floor(v / 8);
    const m = z % 2 === 0 ? z / 2 : -(z + 1) / 2;
    return m / 10 ** e;
  }
  /** A length-prefixed sub-reader; this reader skips past it. */
  chunk() {
    const length = this.varint();
    if (this.pos + length > this.end) throw new Error("token ends early");
    const sub = new Reader(this.bytes, this.pos + length);
    sub.pos = this.pos;
    this.pos += length;
    return sub;
  }
  skip(wire: number) {
    if (wire === WIRE.varint) this.varint();
    else if (wire === WIRE.number) this.number();
    else if (wire === WIRE.bytes) this.chunk();
    else if (wire !== WIRE.null) throw new Error(`unknown wire type ${wire}`);
  }
}

const utf8 = new TextEncoder();
const fromUtf8 = new TextDecoder();
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// ---------------------------------------------------------------- encode

function encodeMessage(fields: readonly Field[], value: Record<string, unknown>): number[] {
  const w = new Writer();
  for (const field of fields) {
    if (field.retired) continue;
    const v = value[field.key];
    if (v === undefined) continue;
    switch (field.kind) {
      case "number":
        if (typeof v === "number" && Number.isFinite(v) && v !== field.base) {
          w.tag(field.id, WIRE.number);
          w.number(v);
        }
        break;
      case "nullableNumber":
        if (v === field.base) break;
        if (v === null) w.tag(field.id, WIRE.null);
        else if (typeof v === "number" && Number.isFinite(v)) {
          w.tag(field.id, WIRE.number);
          w.number(v);
        }
        break;
      case "string":
        if (typeof v === "string" && v !== field.base) {
          w.tag(field.id, WIRE.bytes);
          w.chunk([...utf8.encode(v)]);
        }
        break;
      case "enum": {
        const index = field.values.indexOf(v as string);
        if (index >= 0 && v !== field.base) {
          w.tag(field.id, WIRE.varint);
          w.varint(index);
        }
        break;
      }
      case "boolean":
        if (typeof v === "boolean" && v !== field.base) {
          w.tag(field.id, WIRE.varint);
          w.varint(v ? 1 : 0);
        }
        break;
      case "message":
        if (isObject(v)) {
          const body = encodeMessage(field.fields, v);
          // An optional message is written even when empty: present (at its bases) differs from absent.
          if (body.length || field.optional) {
            w.tag(field.id, WIRE.bytes);
            w.chunk(body);
          }
        }
        break;
      case "list":
        if (Array.isArray(v) && !same(v, field.base)) {
          const body = new Writer();
          body.varint(v.length);
          for (const item of v) body.chunk(isObject(item) ? encodeMessage(field.element, item) : []);
          w.tag(field.id, WIRE.bytes);
          w.chunk(body.bytes);
        }
        break;
      case "numbers":
        if (Array.isArray(v) && !same(v, field.base)) {
          const body = new Writer();
          const values = v.filter((n): n is number => typeof n === "number" && Number.isFinite(n));
          body.varint(values.length);
          for (const n of values) body.number(n);
          w.tag(field.id, WIRE.bytes);
          w.chunk(body.bytes);
        }
        break;
      case "map":
        if (isObject(v) && Object.keys(v).length) {
          const body = new Writer();
          const entries = Object.entries(v).filter(([, item]) => isObject(item));
          body.varint(entries.length);
          for (const [key, item] of entries) {
            body.chunk([...utf8.encode(key)]);
            body.chunk(encodeMessage(field.value, item as Record<string, unknown>));
          }
          w.tag(field.id, WIRE.bytes);
          w.chunk(body.bytes);
        }
        break;
    }
  }
  return w.bytes;
}

// ---------------------------------------------------------------- decode

/** The value a field takes when a token doesn't carry it. */
function baseValue(field: Field): unknown {
  switch (field.kind) {
    case "message":
      return field.optional ? undefined : baseMessage(field.fields);
    case "map":
      return {};
    case "list":
    case "numbers":
      return JSON.parse(JSON.stringify(field.base));
    default:
      return field.base;
  }
}

function baseMessage(fields: readonly Field[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    const v = baseValue(field);
    if (!field.retired && v !== undefined) out[field.key] = v;
  }
  return out;
}

const EXPECTED_WIRE: Record<Field["kind"], number> = {
  number: WIRE.number,
  nullableNumber: WIRE.number,
  string: WIRE.bytes,
  enum: WIRE.varint,
  boolean: WIRE.varint,
  message: WIRE.bytes,
  list: WIRE.bytes,
  numbers: WIRE.bytes,
  map: WIRE.bytes,
};

function decodeMessage(fields: readonly Field[], r: Reader): Record<string, unknown> {
  const out = baseMessage(fields);
  while (!r.done) {
    const tag = r.varint();
    const id = Math.floor(tag / 8);
    const wire = tag % 8;
    const field = fields.find((f) => f.id === id);
    const fits = field && (wire === EXPECTED_WIRE[field.kind] || (field.kind === "nullableNumber" && wire === WIRE.null));
    if (!field || !fits) {
      r.skip(wire);
      continue;
    }
    const value = decodeValue(field, wire, r);
    if (!field.retired && value !== undefined) out[field.key] = value;
  }
  return out;
}

function decodeValue(field: Field, wire: number, r: Reader): unknown {
  switch (field.kind) {
    case "number":
      return r.number();
    case "nullableNumber":
      return wire === WIRE.null ? null : r.number();
    case "string":
      return readString(r);
    case "enum":
      // An index from a newer version this one doesn't know keeps the base.
      return field.values[r.varint()];
    case "boolean":
      return r.varint() !== 0;
    case "message":
      return decodeMessage(field.fields, r.chunk());
    case "list": {
      const body = r.chunk();
      const count = body.varint();
      return Array.from({ length: count }, () => decodeMessage(field.element, body.chunk()));
    }
    case "numbers": {
      const body = r.chunk();
      const count = body.varint();
      return Array.from({ length: count }, () => body.number());
    }
    case "map": {
      const body = r.chunk();
      const count = body.varint();
      const out: Record<string, unknown> = {};
      for (let i = 0; i < count; i++) {
        const key = readString(body);
        const value = decodeMessage(field.value, body.chunk());
        if (key !== "__proto__") out[key] = value;
      }
      return out;
    }
  }
}

function readString(r: Reader) {
  const sub = r.chunk();
  const bytes: number[] = [];
  while (!sub.done) bytes.push(sub.byte());
  return fromUtf8.decode(new Uint8Array(bytes));
}

// ---------------------------------------------------------------- base64url

function toBase64Url(bytes: number[]): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(text)) return null;
  try {
    const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- public

/** Raw decoded values (before the app's type checks); exported for the compatibility tests. */
export function decodeTokenRaw(token: string): Record<string, unknown> | null {
  const bytes = fromBase64Url(token.replace(/^#/, ""));
  if (!bytes || bytes.length === 0) return null;
  const r = new Reader(bytes);
  try {
    const version = r.byte();
    if (version === 1) return decodeMessage(TOKEN_SCHEMA, r);
    return null; // unknown (newer, incompatible) format
  } catch {
    return null;
  }
}

/** The share token for `settings` (search text and the manufacturer filter aren't part of a setup). */
export function settingsToToken(settings: AppSettings): string {
  return toBase64Url([TOKEN_FORMAT_VERSION, ...encodeMessage(TOKEN_SCHEMA, settings as unknown as Record<string, unknown>)]);
}

/** Settings from a token (with or without a leading "#"), or null if it isn't a valid token. */
export function settingsFromToken(token: string): AppSettings | null {
  const raw = decodeTokenRaw(token);
  return raw ? parseSettings({ ...raw, query: DEFAULT_SETTINGS.query, scope: DEFAULT_SETTINGS.scope }) : null;
}

/** Flat description of the schema (path, id path, kind, base, enum values), for the compatibility tests. */
export function describeSchema(fields: readonly Field[] = TOKEN_SCHEMA, path = "", ids = ""): Record<string, unknown>[] {
  return fields.flatMap((field) => {
    const at = path ? `${path}.${field.key}` : field.key;
    const id = ids ? `${ids}.${field.id}` : String(field.id);
    const { fields: sub, element, value, key: _key, id: _id, ...rest } = field as Field & { fields?: Field[]; element?: Field[]; value?: Field[] };
    const entry = { path: at, id, ...rest };
    const children = sub ?? element ?? value;
    return [entry, ...(children ? describeSchema(children, at, id) : [])];
  });
}

/** Whether `settings` is the app's current default setup (search text and filter aside). */
export function isDefaultSetup(settings: AppSettings): boolean {
  const strip = ({ query: _q, scope: _s, ...rest }: AppSettings) => rest;
  return same(strip(settings), strip(DEFAULT_SETTINGS));
}
