/**
 * Ring-and-pinion ratios sold for the common drag-racing rear ends, for the axle ratio optimizer.
 * Gathered from retailer listings (Summit Racing, JEGS, Speedway Motors, Strange Engineering, Mark Williams)
 * of Richmond, Motive Gear, Yukon and house-brand sets, 2026-11-26. Only ratios seen listed for that axle are
 * included; near-duplicates are kept as sold (4.10 / 4.11, 4.56 / 4.57).
 */
export type AxleFamily = { name: string; ratios: readonly number[]; source: string };

export const AXLE_FAMILIES: readonly AxleFamily[] = [
  {
    name: "Ford 9 in",
    ratios: [3.0, 3.25, 3.5, 3.6, 3.7, 3.89, 4.11, 4.29, 4.56, 4.57, 4.86, 5.14, 5.43, 5.67, 6.0, 6.2, 6.83],
    source:
      "Summit Racing Ford 9 in ring-and-pinion listings (3.00-5.43); Speedway Motors Richmond F9514 (5.14); JEGS Richmond 79-0007-1 (5.67) " +
      "and 69-0290-1 (6.20); Strange Engineering Richmond Pro Gear (6.00); 3.60 Richmond Pro Gear, 6.83 circle-track set. 4.71 left out (discontinued).",
  },
  {
    name: "GM 12-bolt passenger car",
    ratios: [3.08, 3.31, 3.42, 3.55, 3.73, 3.9, 4.1, 4.11, 4.33, 4.56, 4.88, 5.14],
    source:
      "Summit Racing GM 8.875 in 12-bolt car listings (3.08, 3.31, 3.55, 3.90, 4.10, 4.56, 4.33 Richmond 79-0074-1); JEGS Richmond 49-0113-1 (3.42), " +
      "49-0280-1 (3.73), 69-0204-1 (4.10), 79-0072-1 (4.56), JEGS 555-60082 (3.73); Pro Gear 4.11 and 4.88 Street Gear; 5.14 Pro Gear (third-party listing only).",
  },
  {
    name: "Dana 60",
    ratios: [3.54, 3.73, 4.1, 4.3, 4.56, 4.88, 5.13, 5.38, 5.86, 6.17, 7.17],
    source:
      "JEGS Motive Gear D60-354 (3.54), D60-456 (4.56), D60-488 (4.88); Summit Racing Dana 60 listings (3.73, 4.10, 4.30, 5.13, 5.86, 7.17); " +
      "Richmond Pro Gear 5.38 and 6.17.",
  },
];

/** Every listed ratio once, ascending. */
export const COMMON_AXLE_RATIOS: readonly number[] = [...new Set(AXLE_FAMILIES.flatMap((family) => family.ratios))].sort((a, b) => a - b);
