export type TransmissionVariant = {
  name: string;
  gear_ratios: number[];
  application_manufacturers: string[];
  reverse_ratio?: number | null;
};

export type TransmissionFamily = {
  manufacturer: string;
  model: string;
  variants: TransmissionVariant[];
};

export const transmissionFamilies: TransmissionFamily[] = [
  {
    manufacturer: "Tremec",
    model: "TKX",
    variants: [
      { name: "GM Close Ratio", gear_ratios: [2.87, 1.89, 1.28, 1.0, 0.81], application_manufacturers: ["GM"] },
      { name: "Ford Close Ratio", gear_ratios: [2.87, 1.89, 1.28, 1.0, 0.81], application_manufacturers: ["Ford"] },
      { name: "GM Wide Ratio", gear_ratios: [2.87, 1.89, 1.28, 1.0, 0.81], application_manufacturers: ["GM"] },
      { name: "Ford Wide Ratio", gear_ratios: [2.87, 1.89, 1.28, 1.0, 0.81], application_manufacturers: ["Ford"] },
    ],
  },
  {
    manufacturer: "Aisin",
    model: "L43",
    variants: [{ name: "Toyota", gear_ratios: [3.67, 2.11, 1.451, 1.0], application_manufacturers: ["Toyota"], reverse_ratio: 4.18 }],
  },
  {
    manufacturer: "Aisin",
    model: "L45",
    variants: [{ name: "Toyota", gear_ratios: [3.928, 2.333, 1.451, 1.0], application_manufacturers: ["Toyota"], reverse_ratio: 4.743 }],
  },
  {
    manufacturer: "Aisin",
    model: "L50",
    variants: [{ name: "Toyota", gear_ratios: [3.928, 2.333, 1.451, 1.0, 0.851], application_manufacturers: ["Toyota"], reverse_ratio: 4.743 }],
  },
  {
    manufacturer: "Aisin",
    model: "W56",
    variants: [{ name: "Toyota", gear_ratios: [3.954, 2.141, 1.384, 1.0, 0.85], application_manufacturers: ["Toyota"], reverse_ratio: 4.091 }],
  },
  {
    manufacturer: "GM",
    model: "Muncie M20",
    variants: [
      { name: "63-65 Wide Ratio", gear_ratios: [2.56, 1.91, 1.48, 1.0], application_manufacturers: ["GM"] },
      { name: "66-70 Wide Ratio", gear_ratios: [2.52, 1.88, 1.46, 1.0], application_manufacturers: ["GM"] },
      { name: "71-74 Wide Ratio", gear_ratios: [2.52, 1.88, 1.46, 1.0], application_manufacturers: ["GM"] },
    ],
  },
];