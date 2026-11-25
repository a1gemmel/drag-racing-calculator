import { automaticDefaults, type AutomaticSetup } from "./automatic";

export type TransmissionVariant = {
  name: string;
  /** Forward gear ratios, first gear first. */
  gear_ratios: number[];
  application_manufacturers: string[];
  reverse_ratio?: number | null;
  /** Where the ratios came from: a URL or citation. */
  source?: string;
};

export type TransmissionKind = "manual" | "automatic";

export type TransmissionFamily = {
  manufacturer: string;
  model: string;
  variants: TransmissionVariant[];
  /** Defaults to manual. */
  kind?: TransmissionKind;
  /** Converter and launch defaults for automatics. */
  automatic?: AutomaticSetup;
};

export const familyKind = (family: TransmissionFamily): TransmissionKind => family.kind ?? "manual";

// Shared citations. Several variants draw on the same reference tables.
const TREMEC_AFTERMARKET_RATIOS =
  "TREMEC, Aftermarket Manual Transmission Gear Ratios: https://tremec-blog.com/tremec-aftermarket-manual-transmission-gear-ratios/";
const TREMEC_TKX_SERVICE_MANUAL =
  "TREMEC TKX Service Manual (TCET18083 spec table): https://tremec.com/wp-content/uploads/2023/05/TKX-Service-Manual_04.05.2021.pdf";
const BRITISHV8_T5_TAGS =
  "British V8 Newsletter, Identification Guide to Borg-Warner T5 Transmissions (D. Gable, 2007): https://www.britishv8.org/Articles/Borg-Warner-T5-ID-Tags.htm";
const T5_HISTORY =
  "The many different faces of the T5 (rebuilder T5 history): https://cdn.shopify.com/s/files/1/0667/1555/files/T5history.pdf";
const MODERN_DRIVELINE_MUSTANG =
  "Modern Driveline, Breakdown of Mustang Transmissions from 1979 to Present: https://www.moderndriveline.com/resources/?p=73839";
const WIKIPEDIA_T56 =
  "Borg-Warner T-56 transmission, assembly part number table: https://en.wikipedia.org/wiki/Borg-Warner_T-56_transmission";
const DIESELHUB_NV3500 = "DieselHub, NV3500 Transmission Ratios: https://dieselhub.com/trans/nv3500.html";
const WIKIPEDIA_NV3500 = "New Venture Gear 3500 transmission: https://en.wikipedia.org/wiki/New_Venture_Gear_3500_transmission";
const ADVANCE_ADAPTERS_NV4500 = "Advance Adapters, NV4500 Specifications: https://advanceadapters.com/1-nv4500-specifications";
const DIESELHUB_NV4500 = "DieselHub, NV4500 Transmission Ratios: https://dieselhub.com/trans/nv4500.html";
const RANDYS_MUNCIE = "Randy's Worldwide, Muncie Transmission ID: https://www.randysworldwide.com/import_export/Muncie_Trans_ID.pdf";
const WIKIPEDIA_POWERGLIDE = "Powerglide (1.76 / 1.82 low; reverse equals low): https://en.wikipedia.com/wiki/Powerglide";
const CHEVY_1971_TRANS_MANUAL =
  "1971 Chevrolet transmission service manual, Powerglide (reverse uses the low reduction): https://oldcarmanualproject.com/manuals/trans/TTransChev1971/TTransChev19718.html";
const DIESELHUB_TH350 = "DieselHub, General Motors TH350: https://www.dieselhub.com/transmission/th350.html";
const HOLLEY_GM_AUTOMATICS = "Holley, Everything you need to know about GM automatic transmissions: https://www.holley.com/blog/post/everything_you_need_to_know_about_gm_automatic_transmissions/";
const F150HUB_C4_C6 = "F150Hub, C4 & C6 Transmission Gear Ratios: https://www.f150hub.com/trans/ford-c4-c6.html";
const ADVANCE_ADAPTERS_C6 = "Advance Adapters, Ford C6: https://advanceadapters.com/2-ford-c6";
const WIKIPEDIA_4L60E = "GM 4L60-E transmission: https://www.wikipedia.org/wiki/4L60-E";
const DIESELHUB_4L80E = "DieselHub, 4L80E: https://www.dieselhub.com/trans/4l80e.html";
const WIKIPEDIA_8HP = "ZF 8HP transmission (8HP70, 2010+ ratios): https://wikipedia.com/wiki/ZF_8HP_transmission";

export const transmissionFamilies: TransmissionFamily[] = [
  {
    manufacturer: "Tremec",
    model: "TKX",
    variants: [
      {
        name: "GM Close Ratio",
        gear_ratios: [2.87, 1.89, 1.28, 1.0, 0.81],
        application_manufacturers: ["GM"],
        reverse_ratio: 2.56,
        source: TREMEC_AFTERMARKET_RATIOS,
      },
      {
        name: "Ford Close Ratio",
        gear_ratios: [2.87, 1.89, 1.28, 1.0, 0.81],
        application_manufacturers: ["Ford"],
        reverse_ratio: 2.56,
        source: TREMEC_AFTERMARKET_RATIOS,
      },
      {
        name: "GM Close Ratio, 0.68 OD",
        gear_ratios: [2.87, 1.89, 1.28, 1.0, 0.68],
        application_manufacturers: ["GM"],
        reverse_ratio: 2.56,
        source: TREMEC_AFTERMARKET_RATIOS,
      },
      {
        name: "Ford Close Ratio, 0.68 OD",
        gear_ratios: [2.87, 1.89, 1.28, 1.0, 0.68],
        application_manufacturers: ["Ford"],
        reverse_ratio: 2.56,
        source: `${TREMEC_AFTERMARKET_RATIOS}; Ford Performance M-7003-TKX68: https://performanceparts.ford.com/part/M-7003-TKX68`,
      },
      {
        name: "GM Wide Ratio",
        gear_ratios: [3.27, 1.98, 1.34, 1.0, 0.72],
        application_manufacturers: ["GM"],
        reverse_ratio: 3.0,
        source: `${TREMEC_TKX_SERVICE_MANUAL}; ${TREMEC_AFTERMARKET_RATIOS}`,
      },
      {
        name: "Ford Wide Ratio",
        gear_ratios: [3.27, 1.98, 1.34, 1.0, 0.72],
        application_manufacturers: ["Ford"],
        reverse_ratio: 3.0,
        source: TREMEC_AFTERMARKET_RATIOS,
      },
    ],
  },
  {
    // Borg-Warner T5; production taken over by Tremec in the late 1990s.
    // Reverse ratios and tag numbers are from the British V8 tag chart unless noted.
    manufacturer: "Tremec",
    model: "T5",
    variants: [
      {
        name: "Non-World Class Ford 5.0 (1983.5)",
        gear_ratios: [2.95, 1.94, 1.34, 1.0, 0.73],
        application_manufacturers: ["Ford"],
        reverse_ratio: 2.76,
        source: MODERN_DRIVELINE_MUSTANG,
      },
      {
        name: "Non-World Class Ford 5.0 (1984)",
        gear_ratios: [2.95, 1.94, 1.34, 1.0, 0.63],
        application_manufacturers: ["Ford"],
        reverse_ratio: 2.76,
        source: `${BRITISHV8_T5_TAGS} (tag 1352-065); ${T5_HISTORY}`,
      },
      {
        name: "Non-World Class Ford 2.3 Turbo (1983-84)",
        gear_ratios: [4.03, 2.37, 1.49, 1.0, 0.86],
        application_manufacturers: ["Ford"],
        reverse_ratio: 3.76,
        source: `${BRITISHV8_T5_TAGS} (tags 1352-018, -067)`,
      },
      {
        name: "Non-World Class GM F-body V8, 0.73 OD (1983-84)",
        gear_ratios: [2.95, 1.94, 1.34, 1.0, 0.73],
        application_manufacturers: ["GM"],
        reverse_ratio: 2.76,
        source: `${BRITISHV8_T5_TAGS} (tags 1352-028, -062, -070)`,
      },
      {
        name: "Non-World Class GM F-body V8, 0.63 OD (1985-87)",
        gear_ratios: [2.95, 1.94, 1.34, 1.0, 0.63],
        application_manufacturers: ["GM"],
        reverse_ratio: 2.76,
        source: `${BRITISHV8_T5_TAGS} (tags 1352-072, -157, -166, -182)`,
      },
      {
        name: "Non-World Class GM F-body 2.8 V6 (1984)",
        gear_ratios: [3.5, 2.14, 1.39, 1.0, 0.78],
        application_manufacturers: ["GM"],
        reverse_ratio: 3.39,
        source: `${BRITISHV8_T5_TAGS} (tag 1352-061)`,
      },
      {
        name: "Non-World Class GM F-body 2.8 V6 (1985-87)",
        gear_ratios: [4.03, 2.37, 1.49, 1.0, 0.76],
        application_manufacturers: ["GM"],
        reverse_ratio: 3.76,
        source: `${BRITISHV8_T5_TAGS} (tags 1352-071, -156, -161, -181)`,
      },
      {
        // Reverse is 3.76 or 3.39 depending on tag, so it is left unset.
        name: "Non-World Class GM S-10/S-15 (1982-85, 4.03 first)",
        gear_ratios: [4.03, 2.37, 1.49, 1.0, 0.86],
        application_manufacturers: ["GM"],
        reverse_ratio: null,
        source: `${BRITISHV8_T5_TAGS} (tags 1352-010, -012, -055, -058)`,
      },
      {
        name: "Non-World Class GM S-10 2.0/2.8 (1983, 3.50 first)",
        gear_ratios: [3.5, 2.14, 1.39, 1.0, 0.78],
        application_manufacturers: ["GM"],
        reverse_ratio: 3.39,
        source: `${BRITISHV8_T5_TAGS} (tag 1352-033)`,
      },
      {
        name: "Non-World Class Jeep CJ (1982-86)",
        gear_ratios: [4.03, 2.37, 1.5, 1.0, 0.86],
        application_manufacturers: ["Jeep", "AMC"],
        reverse_ratio: 3.76,
        source: "Advance Adapters, Jeep T4/T5 Transmissions: https://advanceadapters.com/c-jeep-t4-t5-transmissions",
      },
      {
        name: "World Class Ford 5.0 (1985-89)",
        gear_ratios: [3.35, 1.93, 1.29, 1.0, 0.68],
        application_manufacturers: ["Ford"],
        reverse_ratio: 3.15,
        source: `${MODERN_DRIVELINE_MUSTANG}; ${BRITISHV8_T5_TAGS} (tags 1352-141, -165, -169); ${T5_HISTORY}`,
      },
      {
        name: "World Class Ford 5.0 (1990-95)",
        gear_ratios: [3.35, 1.99, 1.33, 1.0, 0.68],
        application_manufacturers: ["Ford"],
        reverse_ratio: 3.15,
        source: `${MODERN_DRIVELINE_MUSTANG}; ${BRITISHV8_T5_TAGS} (tags 1352-199, -208, -218, -253)`,
      },
      {
        name: "World Class Ford 2.3 (1987-93)",
        gear_ratios: [3.97, 2.34, 1.48, 1.0, 0.79],
        application_manufacturers: ["Ford"],
        reverse_ratio: 3.7,
        source: `${BRITISHV8_T5_TAGS} (tags 1352-162, -194, -209); ${T5_HISTORY}`,
      },
      {
        name: "World Class Ford 2.3 Turbo (1985-86, 4.03 first)",
        gear_ratios: [4.03, 2.37, 1.49, 1.0, 0.81],
        application_manufacturers: ["Ford"],
        reverse_ratio: 3.76,
        source: `${BRITISHV8_T5_TAGS} (tags 1352-114, -167)`,
      },
      {
        name: "World Class Ford Mustang SVO 2.3 Turbo (1985.5-86)",
        gear_ratios: [3.5, 2.14, 1.39, 1.0, 0.78],
        application_manufacturers: ["Ford"],
        reverse_ratio: 3.39,
        source: `${BRITISHV8_T5_TAGS} (tags 1352-116, -168); ${T5_HISTORY}`,
      },
      {
        name: "World Class Ford Mustang 3.8 V6 (1994-95)",
        gear_ratios: [3.35, 1.93, 1.29, 1.0, 0.73],
        application_manufacturers: ["Ford"],
        reverse_ratio: 3.51,
        source:
          "Ford 1994 Mustang Workshop Manual, Section 07-03 Transmission, Manual - T5OD: https://www.fordservicecontent.dealerconnection.com/pubs/content/~WSRB/~MUS~LEN/20/SRB73038.HTM",
      },
      {
        name: "World Class Ford Mustang 4.0 V6 (2005-10)",
        gear_ratios: [3.75, 2.19, 1.41, 1.0, 0.72],
        application_manufacturers: ["Ford"],
        reverse_ratio: 3.31,
        source: "CJ Pony Parts, T5 Mustang Transmission Specs: https://www.cjponyparts.com/resources/ford-mustang-t5-transmission",
      },
      {
        name: "World Class Ford Motorsport T5Z / Tremec aftermarket (2.95 first, 0.63 OD)",
        gear_ratios: [2.95, 1.94, 1.34, 1.0, 0.63],
        application_manufacturers: ["Ford"],
        reverse_ratio: 2.76,
        source: `${TREMEC_AFTERMARKET_RATIOS}; ${BRITISHV8_T5_TAGS} (tags 1352-249, -251); ${T5_HISTORY}`,
      },
      {
        name: "World Class GM F-body V8, 0.63 OD (1988-92)",
        gear_ratios: [2.95, 1.94, 1.34, 1.0, 0.63],
        application_manufacturers: ["GM"],
        reverse_ratio: 2.76,
        source: `${BRITISHV8_T5_TAGS} (tags 1352-176, -196, -213)`,
      },
      {
        name: "World Class GM F-body V8, 0.73 OD (1988-92)",
        gear_ratios: [2.95, 1.94, 1.34, 1.0, 0.73],
        application_manufacturers: ["GM"],
        reverse_ratio: 2.76,
        source: `${BRITISHV8_T5_TAGS} (tags 1352-175, -195, -212)`,
      },
      {
        name: "World Class GM F-body 2.8 V6 (1988-92)",
        gear_ratios: [4.03, 2.37, 1.49, 1.0, 0.76],
        application_manufacturers: ["GM"],
        reverse_ratio: 3.76,
        source: `${BRITISHV8_T5_TAGS} (tags 1352-177, -197, -214)`,
      },
      {
        name: "World Class GM F-body V6 (1993-96)",
        gear_ratios: [3.75, 2.19, 1.41, 1.0, 0.72],
        application_manufacturers: ["GM"],
        reverse_ratio: 3.53,
        source: `${BRITISHV8_T5_TAGS} (tags 1352-210, -245, -247)`,
      },
      {
        name: "World Class GM S-10 2.5 (1989-93)",
        gear_ratios: [4.03, 2.37, 1.49, 1.0, 0.86],
        application_manufacturers: ["GM"],
        reverse_ratio: 3.76,
        source: `${BRITISHV8_T5_TAGS} (tags 1352-193, -201, -206, -233)`,
      },
      {
        name: "World Class GM S-10 (1992-93, 3.97 first)",
        gear_ratios: [3.97, 2.34, 1.48, 1.0, 0.72],
        application_manufacturers: ["GM"],
        reverse_ratio: 3.7,
        source: `${BRITISHV8_T5_TAGS} (tags 1352-211, -222, -232)`,
      },
    ],
  },
  {
    // Original Borg-Warner/Tremec T56 (factory applications). See "T56 Magnum" for the aftermarket unit.
    manufacturer: "Tremec",
    model: "T56",
    variants: [
      {
        name: "Dodge Viper (1992-2006)",
        gear_ratios: [2.66, 1.78, 1.3, 1.0, 0.74, 0.5],
        application_manufacturers: ["Dodge"],
        reverse_ratio: 2.9,
        source: WIKIPEDIA_T56,
      },
      {
        name: "GM F-body M28, 2.73 axle (1993)",
        gear_ratios: [3.36, 2.07, 1.35, 1.0, 0.8, 0.62],
        application_manufacturers: ["GM"],
        reverse_ratio: 3.28,
        source: WIKIPEDIA_T56,
      },
      {
        name: "GM F-body M29, 3.23 axle (1993)",
        gear_ratios: [2.97, 2.07, 1.43, 1.0, 0.8, 0.62],
        application_manufacturers: ["GM"],
        reverse_ratio: 3.28,
        source: WIKIPEDIA_T56,
      },
      {
        name: "GM F-body (1994-2002) / Corvette C5 MM6 (1997-2004)",
        gear_ratios: [2.66, 1.78, 1.3, 1.0, 0.74, 0.5],
        application_manufacturers: ["GM"],
        reverse_ratio: 2.9,
        source: WIKIPEDIA_T56,
      },
      {
        name: "Corvette C5 Z06 MZ6 / Cadillac CTS-V (M12)",
        gear_ratios: [2.97, 2.07, 1.43, 1.0, 0.84, 0.56],
        application_manufacturers: ["GM"],
        reverse_ratio: 2.9,
        source: WIKIPEDIA_T56,
      },
      {
        name: "Ford Mustang Cobra (2003-04)",
        gear_ratios: [2.66, 1.78, 1.3, 1.0, 0.8, 0.63],
        application_manufacturers: ["Ford"],
        reverse_ratio: 2.9,
        source: `${MODERN_DRIVELINE_MUSTANG}; ${WIKIPEDIA_T56}`,
      },
      {
        name: "Aftermarket GM/Ford (2.97 first, 0.80/0.62 OD)",
        gear_ratios: [2.97, 2.07, 1.43, 1.0, 0.8, 0.62],
        application_manufacturers: ["GM", "Ford"],
        reverse_ratio: 3.28,
        source: `${WIKIPEDIA_T56} (1386-000-011, 1386-000-012, TUET-1259)`,
      },
      {
        name: "Aston Martin (0.79/0.63 OD)",
        gear_ratios: [2.66, 1.78, 1.3, 1.0, 0.79, 0.63],
        application_manufacturers: ["Aston Martin"],
        reverse_ratio: 2.9,
        source: `${WIKIPEDIA_T56} (1386-000-021, TUET-1576)`,
      },
    ],
  },
  {
    // Current aftermarket T56 Magnum. Magnum-F and Magnum-XL are packaging variants with the same ratio sets.
    manufacturer: "Tremec",
    model: "T56 Magnum",
    variants: [
      {
        name: "2.66 first, 0.80/0.63 OD",
        gear_ratios: [2.66, 1.78, 1.3, 1.0, 0.8, 0.63],
        application_manufacturers: ["GM", "Ford"],
        reverse_ratio: 2.9,
        source: TREMEC_AFTERMARKET_RATIOS,
      },
      {
        name: "2.97 first, 0.80/0.63 OD",
        gear_ratios: [2.97, 2.1, 1.46, 1.0, 0.8, 0.63],
        application_manufacturers: ["GM", "Ford"],
        reverse_ratio: 2.9,
        source: TREMEC_AFTERMARKET_RATIOS,
      },
      {
        name: "2.97 first, 0.74/0.50 OD",
        gear_ratios: [2.97, 2.1, 1.46, 1.0, 0.74, 0.5],
        application_manufacturers: ["GM", "Ford"],
        reverse_ratio: 2.9,
        source: TREMEC_AFTERMARKET_RATIOS,
      },
    ],
  },
  {
    manufacturer: "New Venture Gear",
    model: "NV3500",
    variants: [
      {
        name: "Wide Ratio: GM C/K 1500 & Dodge Ram 1500",
        gear_ratios: [4.02, 2.32, 1.4, 1.0, 0.73],
        application_manufacturers: ["GM", "Dodge"],
        reverse_ratio: 3.55,
        source: `${DIESELHUB_NV3500}; ${WIKIPEDIA_NV3500}`,
      },
      {
        name: "Close Ratio: GM S-10/Sonoma & Dodge Ram 2500 LD",
        gear_ratios: [3.49, 2.16, 1.4, 1.0, 0.73],
        application_manufacturers: ["GM", "Dodge"],
        reverse_ratio: 3.55,
        source: `${DIESELHUB_NV3500}; ${WIKIPEDIA_NV3500}`,
      },
      {
        name: "NV3500-HD: Dodge Dakota (1994-2004)",
        gear_ratios: [3.49, 2.14, 1.38, 1.0, 0.73],
        application_manufacturers: ["Dodge"],
        reverse_ratio: 3.55,
        source: `${DIESELHUB_NV3500}; ${WIKIPEDIA_NV3500}`,
      },
    ],
  },
  {
    manufacturer: "New Venture Gear",
    model: "NV4500",
    variants: [
      {
        name: "GM 6.34 first (1992-94)",
        gear_ratios: [6.34, 3.44, 1.71, 1.0, 0.73],
        application_manufacturers: ["GM"],
        reverse_ratio: 6.34,
        source: `${DIESELHUB_NV4500}; ${ADVANCE_ADAPTERS_NV4500}`,
      },
      {
        name: "GM 5.61 first (1995-later)",
        gear_ratios: [5.61, 3.04, 1.67, 1.0, 0.73],
        application_manufacturers: ["GM"],
        reverse_ratio: 5.04,
        source: ADVANCE_ADAPTERS_NV4500,
      },
      {
        name: "Dodge Ram 5.61 first, 5.61 reverse (1992-96)",
        gear_ratios: [5.61, 3.04, 1.67, 1.0, 0.73],
        application_manufacturers: ["Dodge"],
        reverse_ratio: 5.61,
        source: ADVANCE_ADAPTERS_NV4500,
      },
      {
        name: "Dodge Ram 5.61 first, 5.04 reverse (1997-later)",
        gear_ratios: [5.61, 3.04, 1.67, 1.0, 0.73],
        application_manufacturers: ["Dodge"],
        reverse_ratio: 5.04,
        source: ADVANCE_ADAPTERS_NV4500,
      },
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
      { name: "63-65 Wide Ratio", gear_ratios: [2.56, 1.91, 1.48, 1.0], application_manufacturers: ["GM"], source: RANDYS_MUNCIE },
      { name: "66-70 Wide Ratio", gear_ratios: [2.52, 1.88, 1.46, 1.0], application_manufacturers: ["GM"], source: RANDYS_MUNCIE },
      { name: "71-74 Wide Ratio", gear_ratios: [2.52, 1.88, 1.46, 1.0], application_manufacturers: ["GM"], source: RANDYS_MUNCIE },
    ],
  },

  // Automatics. Ratios are cited per variant; converter/launch defaults are a typical street/strip
  // setup chosen for this app (see "Automatic transmission defaults" in AGENTS.md), not factory specs.
  {
    manufacturer: "GM",
    model: "Powerglide",
    kind: "automatic",
    automatic: automaticDefaults({ stallRpm: 4000, couplingSlip: 0.06, lockupCapable: false, shiftTimeS: 0.2, shiftLoss: 0.2, drivetrainLoss: 0.11 }),
    variants: [
      { name: "1.76 Low", gear_ratios: [1.76, 1.0], application_manufacturers: ["GM"], reverse_ratio: 1.76, source: `${WIKIPEDIA_POWERGLIDE}; ${CHEVY_1971_TRANS_MANUAL}` },
      { name: "1.82 Low", gear_ratios: [1.82, 1.0], application_manufacturers: ["GM"], reverse_ratio: 1.82, source: `${WIKIPEDIA_POWERGLIDE}; ${CHEVY_1971_TRANS_MANUAL}` },
    ],
  },
  {
    manufacturer: "GM",
    model: "TH350",
    kind: "automatic",
    automatic: automaticDefaults({ stallRpm: 3000, couplingSlip: 0.06, lockupCapable: false, shiftTimeS: 0.2, shiftLoss: 0.2, drivetrainLoss: 0.13 }),
    variants: [
      { name: "Turbo 350", gear_ratios: [2.52, 1.52, 1.0], application_manufacturers: ["GM"], reverse_ratio: 2.07, source: `${DIESELHUB_TH350}; ${HOLLEY_GM_AUTOMATICS}` },
    ],
  },
  {
    manufacturer: "GM",
    model: "TH400",
    kind: "automatic",
    automatic: automaticDefaults({ stallRpm: 3200, couplingSlip: 0.06, lockupCapable: false, shiftTimeS: 0.2, shiftLoss: 0.2, drivetrainLoss: 0.14 }),
    variants: [
      { name: "Turbo 400", gear_ratios: [2.48, 1.48, 1.0], application_manufacturers: ["GM"], reverse_ratio: 2.07, source: HOLLEY_GM_AUTOMATICS },
    ],
  },
  {
    manufacturer: "Ford",
    model: "C4",
    kind: "automatic",
    automatic: automaticDefaults({ stallRpm: 3000, couplingSlip: 0.06, lockupCapable: false, shiftTimeS: 0.2, shiftLoss: 0.2, drivetrainLoss: 0.13 }),
    variants: [{ name: "Cruise-O-Matic C4", gear_ratios: [2.46, 1.46, 1.0], application_manufacturers: ["Ford"], reverse_ratio: 2.18, source: F150HUB_C4_C6 }],
  },
  {
    manufacturer: "Ford",
    model: "C6",
    kind: "automatic",
    automatic: automaticDefaults({ stallRpm: 3000, couplingSlip: 0.06, lockupCapable: false, shiftTimeS: 0.2, shiftLoss: 0.2, drivetrainLoss: 0.14 }),
    variants: [{ name: "Cruise-O-Matic C6", gear_ratios: [2.46, 1.46, 1.0], application_manufacturers: ["Ford"], reverse_ratio: 2.18, source: `${ADVANCE_ADAPTERS_C6}; ${F150HUB_C4_C6}` }],
  },
  {
    manufacturer: "GM",
    model: "4L60E",
    kind: "automatic",
    automatic: automaticDefaults({ stallRpm: 2800, couplingSlip: 0.06, lockupCapable: true, lockup: "off", shiftTimeS: 0.22, shiftLoss: 0.15, drivetrainLoss: 0.13 }),
    variants: [
      { name: "Hydra-Matic 4L60-E", gear_ratios: [3.06, 1.63, 1.0, 0.7], application_manufacturers: ["GM"], reverse_ratio: 2.29, source: WIKIPEDIA_4L60E },
    ],
  },
  {
    manufacturer: "GM",
    model: "4L80E",
    kind: "automatic",
    automatic: automaticDefaults({ stallRpm: 2800, couplingSlip: 0.06, lockupCapable: true, lockup: "off", shiftTimeS: 0.22, shiftLoss: 0.15, drivetrainLoss: 0.15 }),
    variants: [
      { name: "Hydra-Matic 4L80-E", gear_ratios: [2.482, 1.482, 1.0, 0.75], application_manufacturers: ["GM"], reverse_ratio: 2.077, source: DIESELHUB_4L80E },
    ],
  },
  {
    manufacturer: "ZF",
    model: "8HP70",
    kind: "automatic",
    automatic: automaticDefaults({ stallRpm: 2400, couplingSlip: 0.04, lockupCapable: true, lockup: "after1st", shiftTimeS: 0.15, shiftLoss: 0.1, drivetrainLoss: 0.12 }),
    variants: [
      {
        name: "8HP70 (2010+)",
        gear_ratios: [4.714, 3.143, 2.106, 1.667, 1.285, 1.0, 0.839, 0.667],
        application_manufacturers: ["BMW", "Chrysler", "Dodge", "Jeep", "Ram", "Audi"],
        reverse_ratio: 3.317,
        source: WIKIPEDIA_8HP,
      },
    ],
  },
];
