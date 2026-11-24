import type { TransmissionFamily, TransmissionVariant } from "./catalog";

export type ScopeOption = { value: string; label: string };

export const ALL_SCOPE = "all";

/** "All", then one option per transmission manufacturer, then one per vehicle brand. */
export function scopeOptions(families: TransmissionFamily[]): ScopeOption[] {
  const manufacturers = Array.from(new Set(families.map((family) => family.manufacturer))).sort();
  const brands = Array.from(
    new Set(families.flatMap((family) => family.variants.flatMap((variant) => variant.application_manufacturers))),
  ).sort();

  return [
    { value: ALL_SCOPE, label: "All" },
    ...manufacturers.map((manufacturer) => ({ value: `manufacturer:${manufacturer}`, label: `Manufacturer: ${manufacturer}` })),
    ...brands.map((brand) => ({ value: `brand:${brand}`, label: `Brand: ${brand}` })),
  ];
}

function inScope(family: TransmissionFamily, variant: TransmissionVariant, scope: string) {
  if (scope.startsWith("manufacturer:")) return family.manufacturer === scope.slice("manufacturer:".length);
  if (scope.startsWith("brand:")) return variant.application_manufacturers.includes(scope.slice("brand:".length));
  return true;
}

function searchText(family: TransmissionFamily, variant: TransmissionVariant) {
  return [
    family.manufacturer,
    family.model,
    variant.name,
    ...variant.application_manufacturers,
    ...variant.gear_ratios.map((ratio) => ratio.toFixed(2)),
  ]
    .join(" ")
    .toLowerCase();
}

/**
 * Families whose variants are in `scope` and match every whitespace-separated term of `query`
 * (case-insensitive, against manufacturer, model, variant name, vehicle brands and gear ratios).
 * Families with no matching variants are dropped; catalog order is preserved.
 */
export function filterFamilies(families: TransmissionFamily[], scope: string, query: string): TransmissionFamily[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

  return families
    .map((family) => ({
      ...family,
      variants: family.variants.filter((variant) => {
        if (!inScope(family, variant, scope)) return false;
        const text = searchText(family, variant);
        return terms.every((term) => text.includes(term));
      }),
    }))
    .filter((family) => family.variants.length > 0);
}

/**
 * The selected family/variant if it is still among `families`, otherwise the closest fallback:
 * the selected model's first variant, then the first variant of the first family. Null if empty.
 */
export function resolveSelection(
  families: TransmissionFamily[],
  model: string,
  variantName: string,
): { family: TransmissionFamily; variant: TransmissionVariant } | null {
  const family = families.find((item) => item.model === model) ?? families[0];
  if (!family) return null;
  const variant = family.variants.find((item) => item.name === variantName) ?? family.variants[0];
  return variant ? { family, variant } : null;
}
