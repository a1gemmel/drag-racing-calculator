import { GENERIC_AUTOMATIC, type AutomaticSetup } from "./automatic";
import type { TransmissionFamily, TransmissionKind } from "./catalog";

/** A user-defined transmission. Shown in the picker under manufacturer "Custom". */
export type CustomTransmission = {
  name: string;
  kind: TransmissionKind;
  /** Forward gear ratios, 1st first. */
  ratios: number[];
  /** Converter/launch defaults for automatics (copied from the source transmission, or generic). */
  automatic?: AutomaticSetup;
};

export const CUSTOM_MANUFACTURER = "Custom";
export const MAX_GEARS = 10;

export function customFamily(custom: CustomTransmission): TransmissionFamily {
  return {
    manufacturer: CUSTOM_MANUFACTURER,
    model: custom.name,
    kind: custom.kind,
    automatic: custom.kind === "automatic" ? (custom.automatic ?? GENERIC_AUTOMATIC) : undefined,
    variants: [
      {
        name: `${custom.ratios.length}-speed`,
        gear_ratios: custom.ratios,
        application_manufacturers: [CUSTOM_MANUFACTURER],
      },
    ],
  };
}

/**
 * Problems with a custom transmission, given the model names already taken (catalog and other
 * customs, excluding the one being edited). Empty when it can be saved.
 */
export function customProblems(custom: CustomTransmission, takenNames: string[]): string[] {
  const problems: string[] = [];
  const name = custom.name.trim();
  if (!name) problems.push("Name is required");
  else if (takenNames.some((taken) => taken.toLowerCase() === name.toLowerCase())) problems.push("Name is already used");
  if (name.includes("::")) problems.push('Name can\'t contain "::"');
  if (custom.ratios.length < 1 || custom.ratios.length > MAX_GEARS) problems.push(`1 to ${MAX_GEARS} gears`);
  if (custom.ratios.some((ratio) => !(Number.isFinite(ratio) && ratio > 0))) problems.push("Ratios must be greater than 0");
  return problems;
}
