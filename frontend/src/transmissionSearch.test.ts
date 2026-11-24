import { describe, expect, it } from "vitest";
import { transmissionFamilies, type TransmissionFamily } from "./catalog";
import { ALL_SCOPE, filterFamilies, resolveSelection, scopeOptions } from "./transmissionSearch";

const families: TransmissionFamily[] = [
  {
    manufacturer: "Tremec",
    model: "T5",
    variants: [
      { name: "WC Ford 5.0", gear_ratios: [3.35, 1.93, 1.29, 1.0, 0.68], application_manufacturers: ["Ford"] },
      { name: "WC GM F-body", gear_ratios: [2.95, 1.94, 1.34, 1.0, 0.63], application_manufacturers: ["GM"] },
    ],
  },
  {
    manufacturer: "New Venture Gear",
    model: "NV4500",
    variants: [{ name: "Dodge Ram", gear_ratios: [5.61, 3.04, 1.67, 1.0, 0.73], application_manufacturers: ["Dodge"] }],
  },
];

const names = (result: TransmissionFamily[]) =>
  result.flatMap((family) => family.variants.map((variant) => `${family.model}/${variant.name}`));

describe("filterFamilies", () => {
  it("returns everything for an empty query in the All scope", () => {
    expect(names(filterFamilies(families, ALL_SCOPE, "  "))).toHaveLength(3);
  });

  it("requires every term to match, case-insensitively, across fields", () => {
    expect(names(filterFamilies(families, ALL_SCOPE, "t5 FORD"))).toEqual(["T5/WC Ford 5.0"]);
    expect(names(filterFamilies(families, ALL_SCOPE, "new venture dodge"))).toEqual(["NV4500/Dodge Ram"]);
  });

  it("matches gear ratios", () => {
    expect(names(filterFamilies(families, ALL_SCOPE, "2.95"))).toEqual(["T5/WC GM F-body"]);
  });

  it("combines the query with manufacturer and brand scopes", () => {
    expect(names(filterFamilies(families, "manufacturer:Tremec", "wc"))).toHaveLength(2);
    expect(names(filterFamilies(families, "brand:GM", "wc"))).toEqual(["T5/WC GM F-body"]);
    expect(filterFamilies(families, "brand:Dodge", "t5")).toEqual([]);
  });
});

describe("resolveSelection", () => {
  it("defaults to the first variant when nothing is selected", () => {
    const selection = resolveSelection(families, "", "");
    expect([selection?.family.model, selection?.variant.name]).toEqual(["T5", "WC Ford 5.0"]);
  });

  it("keeps a selection that is still visible", () => {
    expect(resolveSelection(families, "T5", "WC GM F-body")?.variant.name).toBe("WC GM F-body");
  });

  it("falls back when a filter hides the selection", () => {
    const filtered = filterFamilies(families, "brand:Dodge", "");
    expect(resolveSelection(filtered, "T5", "WC GM F-body")?.family.model).toBe("NV4500");
  });

  it("returns null when nothing matches", () => {
    expect(resolveSelection([], "T5", "")).toBeNull();
  });
});

describe("scopeOptions", () => {
  it("lists All first and every manufacturer and brand in the catalog", () => {
    const values = scopeOptions(transmissionFamilies).map((option) => option.value);
    expect(values[0]).toBe(ALL_SCOPE);
    expect(values).toContain("manufacturer:Tremec");
    expect(values).toContain("brand:Ford");
  });
});
