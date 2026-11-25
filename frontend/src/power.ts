/**
 * Engine power curves. A curve is a list of crank torque points (lb-ft) by RPM; horsepower is
 * derived (hp = torque * rpm / 5252). Three ways to build one:
 *   1. estimateFromTrap  - car weight + quarter-mile trap speed (Hale's rule of thumb) -> synthesized curve
 *   2. synthesizeCurve   - peak HP @ RPM and peak torque @ RPM -> synthesized curve
 *   3. a dyno table      - points entered by hand or imported with parseDynoText
 */

export const HP_CONSTANT = 5252;

export type CurvePoint = { rpm: number; torque: number };
export type PowerCurve = CurvePoint[];

export const horsepower = (torque: number, rpm: number) => (torque * rpm) / HP_CONSTANT;
export const torqueFromHp = (hp: number, rpm: number) => (hp * HP_CONSTANT) / rpm;

/**
 * Crank torque at `rpm`, linearly interpolated. Below the first point the first torque is held;
 * above the last point the last torque is held (callers warn when the run goes past the data).
 */
export function torqueAt(curve: PowerCurve, rpm: number): number {
  if (curve.length === 0) return 0;
  if (rpm <= curve[0].rpm) return curve[0].torque;
  const last = curve[curve.length - 1];
  if (rpm >= last.rpm) return last.torque;
  let i = 1;
  while (curve[i].rpm < rpm) i++;
  const a = curve[i - 1];
  const b = curve[i];
  return a.torque + ((b.torque - a.torque) * (rpm - a.rpm)) / (b.rpm - a.rpm);
}

/** Sorted by RPM, non-positive and duplicate RPMs removed (the later duplicate wins). */
export function normalizeCurve(points: CurvePoint[]): PowerCurve {
  const byRpm = new Map<number, number>();
  for (const point of points) {
    if (Number.isFinite(point.rpm) && Number.isFinite(point.torque) && point.rpm > 0 && point.torque >= 0) {
      byRpm.set(Math.round(point.rpm), point.torque);
    }
  }
  return [...byRpm.entries()].sort((a, b) => a[0] - b[0]).map(([rpm, torque]) => ({ rpm, torque }));
}

export function curvePeaks(curve: PowerCurve) {
  let hp = { value: 0, rpm: 0 };
  let tq = { value: 0, rpm: 0 };
  for (const point of curve) {
    const power = horsepower(point.torque, point.rpm);
    if (power > hp.value) hp = { value: power, rpm: point.rpm };
    if (point.torque > tq.value) tq = { value: point.torque, rpm: point.rpm };
  }
  return { hp, tq };
}

export type PeakInput = { peakHp: number; peakHpRpm: number; peakTorque: number; peakTorqueRpm: number };
export type CurveResult = { curve: PowerCurve; error: null } | { curve: null; error: string };

/**
 * Builds a plausible naturally aspirated-style curve through the two peaks. It is a cubic Hermite
 * spline in torque with anchors at a low idle point, the torque peak (slope 0), the power peak
 * (slope -T/rpm, which makes hp stationary there) and a fall-off point past the power peak.
 * The real curve's shape is unknown, so treat results as an approximation.
 */
export function synthesizeCurve({ peakHp, peakHpRpm, peakTorque, peakTorqueRpm }: PeakInput): CurveResult {
  if (!(peakHp > 0 && peakTorque > 0 && peakHpRpm > 0 && peakTorqueRpm > 0)) {
    return { curve: null, error: "Enter positive peak numbers." };
  }
  if (peakTorqueRpm >= peakHpRpm) {
    return { curve: null, error: "Peak torque has to come at a lower RPM than peak power." };
  }
  const torqueAtHpPeak = torqueFromHp(peakHp, peakHpRpm);
  if (torqueAtHpPeak >= peakTorque) {
    return {
      curve: null,
      error: `At ${peakHpRpm.toLocaleString()} rpm, ${peakHp} hp needs ${Math.round(torqueAtHpPeak)} lb-ft, more than the peak torque.`,
    };
  }
  if (horsepower(peakTorque, peakTorqueRpm) >= peakHp) {
    return { curve: null, error: "Those numbers put more power at the torque peak than at the power peak." };
  }

  const startRpm = Math.min(1000, Math.round(peakTorqueRpm * 0.5));
  const endRpm = peakHpRpm + Math.max(500, Math.round(peakHpRpm * 0.15));
  const anchors = [
    { rpm: startRpm, torque: peakTorque * 0.72 },
    { rpm: peakTorqueRpm, torque: peakTorque, slope: 0 },
    { rpm: peakHpRpm, torque: torqueAtHpPeak, slope: -torqueAtHpPeak / peakHpRpm },
    { rpm: endRpm, torque: torqueAtHpPeak * 0.84 },
  ];
  anchors[0] = { ...anchors[0], slope: (anchors[1].torque - anchors[0].torque) / (anchors[1].rpm - anchors[0].rpm) };
  anchors[3] = { ...anchors[3], slope: (anchors[3].torque - anchors[2].torque) / (anchors[3].rpm - anchors[2].rpm) };

  const curve: CurvePoint[] = [];
  for (let rpm = startRpm; rpm <= endRpm; rpm += 100) {
    curve.push({ rpm, torque: hermite(anchors as Required<(typeof anchors)[number]>[], rpm) });
  }
  // Make sure the exact anchor RPMs are present so peaks read back exactly.
  for (const anchor of anchors) curve.push({ rpm: anchor.rpm, torque: anchor.torque });
  return { curve: normalizeCurve(curve), error: null };
}

function hermite(anchors: { rpm: number; torque: number; slope: number }[], rpm: number) {
  let i = 1;
  while (i < anchors.length - 1 && anchors[i].rpm < rpm) i++;
  const a = anchors[i - 1];
  const b = anchors[i];
  const h = b.rpm - a.rpm;
  const t = Math.min(1, Math.max(0, (rpm - a.rpm) / h));
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * a.torque + (t3 - 2 * t2 + t) * h * a.slope + (-2 * t3 + 3 * t2) * b.torque + (t3 - t2) * h * b.slope
  );
}

/**
 * Patrick Hale's trap-speed rule of thumb: flywheel hp ≈ weight_lb × (trap_mph / 234)³.
 * Weight is the race weight including driver.
 */
export function hpFromTrap(weightLb: number, trapMph: number) {
  return weightLb * (trapMph / 234) ** 3;
}

/**
 * Trap-speed method: estimate peak hp with Hale's formula, then synthesize a curve with the power
 * peak at `peakHpRpm` and a torque peak 18% higher at 70% of that RPM (a typical street V8 spread).
 */
export function estimateFromTrap(weightLb: number, trapMph: number, peakHpRpm: number): CurveResult & { peakHp: number } {
  const peakHp = hpFromTrap(weightLb, trapMph);
  const torqueAtHpPeak = torqueFromHp(peakHp, peakHpRpm);
  const result = synthesizeCurve({
    peakHp,
    peakHpRpm,
    peakTorque: torqueAtHpPeak * 1.18,
    peakTorqueRpm: Math.round((peakHpRpm * 0.7) / 100) * 100,
  });
  return { ...result, peakHp } as CurveResult & { peakHp: number };
}

export type DynoParse = { points: CurvePoint[]; error: null; note: string } | { points: null; error: string; note?: undefined };

/**
 * Parses pasted dyno data or a CSV export: one row per line, columns split by commas, tabs,
 * semicolons or spaces. A header row naming rpm / torque (tq, lb-ft) / hp (power, whp) picks the
 * columns. Without a header, two columns are read as rpm, torque; with three or more, the two
 * columns after rpm are told apart by which one satisfies hp = torque × rpm / 5252.
 */
export function parseDynoText(text: string): DynoParse {
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    // Delimited rows split on their delimiter only (so "Engine Speed" stays one header cell); otherwise on whitespace.
    .map((line) => line.split(/[,;\t]/.test(line) ? /[,;\t]/ : /\s+/).map((cell) => cell.trim()).filter((cell) => cell !== ""));
  if (rows.length === 0) return { points: null, error: "Paste some rows first." };

  let rpmCol = 0;
  let tqCol: number | null = null;
  let hpCol: number | null = null;
  let note = "";
  const isNumeric = (cell: string) => /^-?\d+(\.\d+)?$/.test(cell);
  let body = rows;

  if (!rows[0].every(isNumeric)) {
    const header = rows[0].map((cell) => cell.toLowerCase());
    const find = (pattern: RegExp) => {
      const index = header.findIndex((cell) => pattern.test(cell));
      return index === -1 ? null : index;
    };
    const foundRpm = find(/rpm|speed|engine/);
    if (foundRpm === null) return { points: null, error: "Couldn't find an RPM column in the header." };
    rpmCol = foundRpm;
    tqCol = find(/tq|torque|lb/);
    hpCol = find(/hp|power|bhp|whp/);
    if (tqCol === null && hpCol === null) return { points: null, error: "Couldn't find a torque or HP column in the header." };
    body = rows.slice(1);
    note = `Read columns from the header: rpm${tqCol !== null ? ", torque" : ""}${hpCol !== null ? ", hp" : ""}.`;
  }

  const numbers = body.map((row) => row.map((cell) => Number.parseFloat(cell))).filter((row) => row.every(Number.isFinite));
  if (numbers.length < 3) return { points: null, error: "Need at least three numeric rows." };

  if (tqCol === null && hpCol === null) {
    const width = Math.min(...numbers.map((row) => row.length));
    if (width < 2) return { points: null, error: "Each row needs at least rpm and torque." };
    if (width === 2) {
      tqCol = 1;
      note = "No header: read columns as rpm, torque.";
    } else {
      // Which of columns 1 and 2 is hp? Score both assignments against hp = tq × rpm / 5252.
      const misfit = (tq: number, hp: number) =>
        numbers.reduce((sum, row) => sum + Math.abs(horsepower(row[tq], row[0]) - row[hp]) / Math.max(row[hp], 1), 0);
      const tqFirst = misfit(1, 2) <= misfit(2, 1);
      tqCol = tqFirst ? 1 : 2;
      hpCol = tqFirst ? 2 : 1;
      note = `No header: read columns as rpm, ${tqFirst ? "torque, hp" : "hp, torque"} (matched by hp = tq × rpm / 5252).`;
    }
  }

  const points = numbers.map((row) => {
    const rpm = row[rpmCol];
    const torque = tqCol !== null ? row[tqCol] : torqueFromHp(row[hpCol as number], rpm);
    return { rpm, torque };
  });
  const curve = normalizeCurve(points);
  if (curve.length < 3) return { points: null, error: "Need at least three rows with positive rpm and torque." };
  return { points: curve, error: null, note: `${note} ${curve.length} points, ${curve[0].rpm}–${curve[curve.length - 1].rpm} rpm.` };
}

export type PowerMethod = "trap" | "peak" | "dyno";
/** Where a curve was measured: at the crank (engine dyno) or at the wheels (chassis dyno). */
export type PowerBasis = "crank" | "wheel";

export type PowerState = {
  method: PowerMethod;
  trapMph: number;
  /** Race weight on the pass the trap speed came from. Independent of the quarter-mile sim's weight. */
  trapWeightLb: number;
  trapPeakRpm: number;
  peak: PeakInput;
  peakBasis: PowerBasis;
  dyno: CurvePoint[];
  dynoBasis: PowerBasis;
};

export const DEFAULT_POWER: PowerState = {
  method: "trap",
  trapMph: 110,
  trapWeightLb: 3700,
  trapPeakRpm: 6000,
  peak: { peakHp: 430, peakHpRpm: 5900, peakTorque: 424, peakTorqueRpm: 4600 },
  peakBasis: "crank",
  dyno: [
    { rpm: 2000, torque: 330 },
    { rpm: 3000, torque: 375 },
    { rpm: 4000, torque: 410 },
    { rpm: 4600, torque: 424 },
    { rpm: 5200, torque: 410 },
    { rpm: 5900, torque: 383 },
    { rpm: 6500, torque: 330 },
  ],
  dynoBasis: "crank",
};

/** Basis of the selected method's numbers. The trap-speed estimate is treated as wheel power. */
export function powerBasis(state: PowerState): PowerBasis {
  return state.method === "trap" ? "wheel" : state.method === "peak" ? state.peakBasis : state.dynoBasis;
}

/** The curve for the selected method. */
export function buildCurve(state: PowerState): CurveResult & { basis: PowerBasis } {
  const basis = powerBasis(state);
  if (state.method === "trap") {
    if (!(state.trapMph > 0 && state.trapWeightLb > 0)) return { curve: null, error: "Enter weight and trap speed.", basis };
    const result = estimateFromTrap(state.trapWeightLb, state.trapMph, state.trapPeakRpm);
    return result.error === null ? { curve: result.curve, error: null, basis } : { curve: null, error: result.error, basis };
  }
  if (state.method === "peak") return { ...synthesizeCurve(state.peak), basis };
  const curve = normalizeCurve(state.dyno);
  return curve.length >= 3 ? { curve, error: null, basis } : { curve: null, error: "The dyno table needs at least three rows.", basis };
}
