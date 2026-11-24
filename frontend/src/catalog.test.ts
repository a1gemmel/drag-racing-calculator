import { describe, expect, it } from "vitest";
import { transmissionFamilies } from "./catalog";

describe("transmission catalog", () => {
  it("has unique family model names", () => {
    const models = transmissionFamilies.map((family) => family.model);
    expect(new Set(models).size).toBe(models.length);
  });

  it("has unique variant names within each family", () => {
    for (const family of transmissionFamilies) {
      const names = family.variants.map((variant) => variant.name);
      expect(new Set(names).size, family.model).toBe(names.length);
    }
  });

  it("has positive ratios with forward gears in descending order", () => {
    for (const family of transmissionFamilies) {
      for (const variant of family.variants) {
        const label = `${family.model} / ${variant.name}`;
        expect(variant.gear_ratios.length, label).toBeGreaterThan(0);
        variant.gear_ratios.forEach((ratio, index) => {
          expect(ratio, label).toBeGreaterThan(0);
          if (index > 0) {
            expect(ratio, label).toBeLessThan(variant.gear_ratios[index - 1]);
          }
        });
        if (variant.reverse_ratio != null) {
          expect(variant.reverse_ratio, label).toBeGreaterThan(0);
        }
      }
    }
  });

  it("lists at least one application manufacturer per variant", () => {
    for (const family of transmissionFamilies) {
      for (const variant of family.variants) {
        expect(variant.application_manufacturers.length, `${family.model} / ${variant.name}`).toBeGreaterThan(0);
      }
    }
  });

  it("does not use the UI key separator in names", () => {
    for (const family of transmissionFamilies) {
      expect(family.model).not.toContain("::");
      for (const variant of family.variants) {
        expect(variant.name).not.toContain("::");
      }
    }
  });
});
