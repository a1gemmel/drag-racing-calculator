/**
 * Effective (rolling) diameter as a fraction of the nominal diameter computed from a tire size.
 * Real tires measure slightly under their rated size, and the loaded sidewall squats, so the
 * rolling radius is a few percent smaller than the size math says. 3% is a rule-of-thumb middle;
 * measured values for street and light-truck tires typically fall around 2-4%.
 */
export const ROLLING_DIAMETER_FACTOR = 0.97;

const MM_PER_INCH = 25.4;

export type TireSize = {
  /** Normalized display form, e.g. "275/55R15" or "35x12.50R17". */
  label: string;
  /** Diameter straight from the size designation, inches. */
  nominalDiameterIn: number;
  /** Nominal diameter after ROLLING_DIAMETER_FACTOR, inches. Use this for speed math. */
  effectiveDiameterIn: number;
};

// P275/55R15, 275/55ZR15, LT285/70R17, 275/55-15, 225/45 R17 (optionally with load/speed suffix after).
const METRIC = /^(P|LT|ST|T)?\s*(\d{3})\s*\/\s*(\d{2,3})\s*(?:Z?R|-|\s)\s*F?\s*(\d{2}(?:\.\d)?)\b/i;
// 35x12.50R17, 33X12.5-15, 31x10.50 R15 LT.
const FLOTATION = /^(\d{2}(?:\.\d+)?)\s*[x×]\s*(\d{1,2}(?:\.\d+)?)\s*(?:R|-|\s)\s*(\d{2}(?:\.\d)?)\b/i;

/** Parse a metric (275/55R15) or flotation (35x12.50R17) tire size. Returns null if unrecognized or implausible. */
export function parseTireSize(input: string): TireSize | null {
  const text = input.trim();

  const metric = METRIC.exec(text);
  if (metric) {
    const [, prefix = "", width, aspect, rim] = metric;
    const sidewallIn = (Number(width) * Number(aspect)) / 100 / MM_PER_INCH;
    const nominal = Number(rim) + 2 * sidewallIn;
    return build(`${prefix.toUpperCase()}${width}/${aspect}R${rim}`, nominal, Number(rim));
  }

  const flotation = FLOTATION.exec(text);
  if (flotation) {
    const [, height, width, rim] = flotation;
    return build(`${height}x${width}R${rim}`, Number(height), Number(rim));
  }

  return null;
}

function build(label: string, nominal: number, rim: number): TireSize | null {
  if (!(rim >= 10 && rim <= 30) || !(nominal > rim && nominal <= 60)) return null;
  return { label, nominalDiameterIn: nominal, effectiveDiameterIn: nominal * ROLLING_DIAMETER_FACTOR };
}
