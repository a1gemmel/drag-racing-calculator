import { automaticDefaults, type AutomaticSetup } from "./automatic";

export type TransmissionVariant = {
  name: string;
  /** Forward gear ratios, first gear first. */
  gear_ratios: number[];
  application_manufacturers: string[];
  reverse_ratio?: number | null;
  /** Where the ratios came from: a URL or citation. */
  source?: string;
  /** Names this variant had in released versions, so saved settings and share links still find it. */
  formerNames?: string[];
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
  /**
   * Dual-clutch manual: clutch launch like a manual, but upshifts hand drive from one clutch to the
   * other with no coasting gap (see quarterMile.ts).
   */
  dualClutch?: boolean;
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
const ATI_GLIDE_GEARSETS =
  "ATI Performance Products Powerglide gear sets (aftermarket low gear ratios, 2nd direct 1.00): https://www.atiracing.com/products/gears/gearsets.htm";
const RICHMOND_SUPER_T10 =
  "Richmond Gear catalog, Super T-10 Plus 4-Speed general specifications (part no., 1st-4th, reverse): https://www.richmondgear.com/wp-content/uploads/pdfs/richmond/RG26.pdf";
const ADVANCE_SAGINAW =
  "Advance Adapters, Saginaw 3 & 4 speeds (ratios by input shaft groove count): https://advanceadapters.com/4-saginaw-3-4-speeds";
const CHEVYHARDCORE_GM_4SPEEDS =
  "Chevy Hardcore, Identify General Motors' four-speed transmissions: https://www.chevyhardcore.com/tech-stories/identify-four-speed-transmissions/";
const FORD_AOD_MANUAL =
  "Ford workshop manual, Transmission, Automatic - AODE (2.40 / 1.47 / 1.00 / 0.67, reverse 2.00): https://www.fordservicecontent.dealerconnection.com/pubs/content/~WSRB/~MUS~LEN/19/SRB71008.HTM";
const F150HUB_AOD = "F150hub, Ford AOD / AODE automatic transmission: https://www.f150hub.com/trans/aod.html";
const MOTORMATCHUP_350Z =
  "MotorMatchup, 2008 Nissan 350Z Touring 6-speed manual specifications: https://www.motormatchup.com/catalog/Nissan/350Z/2008/Touring-(6_speed-Manual)";
const MY350Z_RATIOS =
  "MY350Z.COM, gear ratios for the 6-speed (reverse 3.446): https://my350z.com/forum/2003-2009-nissan-350z/3541-gear-ratios-for-the-6speed-anyone-kno.html";
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
const FCPEURO_8HP45 = "FCP Euro, ZF 8HP45 guide: https://www.fcpeuro.com/blog/zf-8-speed-transmission-guide-8hp45-specs-common-problems-diagnostics-maintenance";
const WIKIPEDIA_RFE = "Chrysler RFE transmission: https://en.wikipedia.org/wiki/Chrysler_RFE_transmission";
const GEARSTAR_545RFE = "Gearstar, 545RFE specs: https://gearstar.com/545rfe-transmission-specs/";
const CARS_65RFE = "Cars.com, 2012 Ram six-speed (65RFE): https://www.cars.com/articles/2012-ram-trucks-receive-new-six-speed-transmissions-454767";
const WIKIPEDIA_TORQUEFLITE = "TorqueFlite (A727): https://en.wikipedia.com/wiki/Torqueflite";
const DIESELHUB_727 = "DieselHub, TorqueFlite A727: https://www.dieselhub.com/transmission/torqueflite-727.html";
const WIKIPEDIA_10SPEED = "Ford-GM 10-speed automatic (10R80): https://en.wikipedia.org/wiki/Ford%E2%80%93GM_10-speed_automatic_transmission";
const GM_8L90 = "GM Powered Solutions, 8L90: https://poweredsolutions.gm.com/products/8l90-8-speed-transmission/";
const CORVETTE_MAG_TR9080 =
  "Corvette Magazine, Two Clutches, No Waiting (TR-9080 ratios 2.91 / 1.76 / 1.22 / 0.88 / 0.65 / 0.51 / 0.40 / 0.33, reverse 2.63): https://www.corvette-mag.com/issues/135/articles/two-clutches-no-waiting";
const LSX_TR9080 = "LSX Magazine, Inside the dual-clutch transmission that redefined the Corvette: TREMEC's TR-9080: https://www.lsxmag.com/?p=24296";
const WIKIPEDIA_5GTRONIC = "Mercedes-Benz 5G-Tronic (W5A580 / NAG1): https://www.wikipedia.org/wiki/5G-TRONIC";
const GEARSTAR_NAG1 = "Gearstar, Overview of the NAG1 transmission: https://gearstar.com/blog/overview-of-the-nag1-transmission";
const GM_6L80_SPECS = "Global Transmission Parts, 6L80 / 6L90 general specs (4.03 / 2.36 / 1.53 / 1.15 / 0.85 / 0.67, reverse 3.06): https://globaltransmissionparts.com/6l80-6l90-general-specs";
const JEGS_6L80 = "JEGS, Chevrolet Performance 6L80-E SuperMatic (lists 1st as 4.02): https://www.jegs.com/i/chevrolet-performance-809-19417102-6l80-e-supermatic-six-speed-automatic-transmission";
const TH700R4HQ_2004R = "700R4 Transmission HQ, 200-4R identification and specs: https://www.700r4transmissionhq.com/gm-automatic-transmissions/2004r/";
const ITSTILLRUNS_2004R = "It Still Runs, 200R4 technical information: https://itstillruns.com/200r4-technical-information-7805525.html";
const CARS_8L90 = "Cars.com, Hydra-Matic 8L90: https://www.cars.com/articles/gm-stuffs-hydra-matic-8l90-with-technology-453444";

// v0.7.0 additions.
const WIKIPEDIA_TR6060 = "Tremec TR-6060 transmission: https://en.wikipedia.org/wiki/Tremec_TR-6060_transmission";
const TORQUENEWS_CHALLENGER = "Torque News, 2020 Dodge Challenger transmission options: https://www.torquenews.com/106/2020-dodge-challenger-details-six-different-transmission-options";
const WIKIPEDIA_TR6070 = "Tremec TR-6070 transmission: https://en.wikipedia.org/wiki/Tremec_TR-6070_transmission";
const WIKIPEDIA_TR3160 = "Tremec TR-3160 transmission: https://en.wikipedia.org/wiki/Tremec_TR-3160_transmission";
const FORD_MUSTANG_2014_MANUAL = "Ford Mustang 2014 workshop manual, MT82 specifications: https://reichwein.it/manuals/Mustang_2014/Workshop_Manual_Wiring_Diagrams/Resources/Service_Manual/seb83a01.htm";
const FORD_2016_MUSTANG_SPECS = "Ford, 2016 Mustang technical specifications: https://media.ford.com/content/dam/lincolnmedia/lna/us/product/2016/2016-Ford-Mustang-Tech-Specs.pdf";
const FORD_2024_MUSTANG_SPECS = "Ford, 2024 Mustang technical specifications: https://ffperformance.co/wp-content/uploads/2023/04/2024-mustang-technical-specifications.pdf";
const MUSTANG6G_D4 = "Mustang6G forum, MT82-D4 ratios relayed from Ford Techline: https://www.mustang6g.com/forums/goto/post?id=2061994";
const WIKIPEDIA_TOPLOADER = "Ford Toploader transmission: https://en.wikipedia.org/wiki/Ford_Toploader_transmission";
const MACS_TOPLOADER = "Mac's Motor City Garage, Secrets of the Ford Toploader 4-speed: https://macsmotorcitygarage.com/secrets-of-the-ford-toploader-4-speed-1964-73/";
const GEARVENDORS_A833 = "Gear Vendors, Chrysler A833 4-speed: https://www.gearvendors.com/?p=1221";
const ADVANCE_T10 = "Advance Adapters, Borg-Warner T10 (ratio table by gear set letter): https://advanceadapters.com/4-borg-warner-t10";
const CORVETTEFORUM_4PLUS3 = "CorvetteForum, Doug Nash 4+3 ratios (overdrive ratio not settled; forum only): https://www.corvetteforum.com/forums/c4-tech-performance/521581-4-3-ratios.html";
const CORVETTEFORUM_ZF6 = "CorvetteForum, ZF6 ratios quoting ZF documentation (forum; some posts list 3rd 1.30, 6th 0.49): https://www.corvetteforum.com/forums/c4-tech-performance/207199-zf6-ratios.html";
const WIKIPEDIA_TOYOTA_W = "Toyota W transmission (W58): https://en.wikipedia.org/wiki/Toyota_W_transmission";
const WIKIPEDIA_TOYOTA_R = "Toyota R transmission (R154): https://en.wikipedia.org/wiki/Toyota_R_transmission";
const MKIVSUPRA_V160 = "MKIVSupra.net, 6-speed V160 / V161 differences (forum; a parts listing agrees on the V160): https://mkivsupra.net/topic/1375-6-speed-v160-v161-differences";
const RX7NZ_JDM_SPEC = "RX7.net.nz, Mazda JDM FD3S specifications: https://www.rx7.net.nz/jpnspc.htm";
const JDMBUYSELL_FC = "JDMBuySell, FC3S RX-7: https://www.jdmbuysell.com/learn/mazda/rx-7/fc3s/";
const SUBARU_2004_MANUAL = "Subaru 2004 Impreza owner's manual, specifications: https://www.manualsdir.com/manuals/151332/subaru-impreza-2004.html?page=16";
const SUBARU_2012_WRX_STI = "Subaru Canada, 2012 WRX / STI specifications: https://www.subaru.ca/content/7907/media/en-ca/download/2012wrxsti_pg_enfinal-vi.pdf";
const SUBARU_2018_WRX = "Subaru, 2018 WRX specifications: https://s3.amazonaws.com/subarumedia.iconicweb.com/mediasite/specs/2018_WRX_specs-FINAL15112017.pdf";
const SUBARU_2013_BRZ = "Subaru, 2013 BRZ specifications: https://s3.amazonaws.com/subarumedia.iconicweb.com/mediasite/specs/2013_SubaruBRZspecs.pdf";
const HYBRID_RACING_K = "Hybrid Racing, K-series transmission guide (vendor chart): https://www.hybrid-racing.com/blogs/hybrid-racing/k-series-transmission-guide";
const HONDATECH_B = "Honda-Tech, B-series transmission guide (forum): https://honda-tech.com/forums/sitemap/t-2931549.html";
const WIKIPEDIA_6R = "Ford 6R transmission (6R60 / 6R80 ratios): https://en.wikipedia.org/wiki/Ford_6R_transmission";
const WIKIPEDIA_TOYOTA_A = "Toyota A transmission (A340E): https://en.wikipedia.org/wiki/Toyota_A_transmission";
const WIKIPEDIA_FMX = "Ford FMX transmission: https://en.wikipedia.org/wiki/Ford_FMX_transmission";
const WIKIPEDIA_4L60 = "GM 4L60 transmission (700R4): https://en.wikipedia.org/wiki/GM_4L60_transmission";

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
        name: "GM F-body (1994-2002) / Corvette C5 MM6 (1997-2004) / C6 MN6 (2005-07)",
        formerNames: ["GM F-body (1994-2002) / Corvette C5 MM6 (1997-2004)"],
        gear_ratios: [2.66, 1.78, 1.3, 1.0, 0.74, 0.5],
        application_manufacturers: ["GM"],
        reverse_ratio: 2.9,
        source: WIKIPEDIA_T56,
      },
      {
        name: "Corvette C5 Z06 / C6 Z51 MZ6 (2005-07) / CTS-V (M12) / GTO (2004-06)",
        formerNames: ["Corvette C5 Z06 MZ6 / Cadillac CTS-V (M12)"],
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
      { name: "63-65 Wide Ratio", gear_ratios: [2.56, 1.91, 1.48, 1.0], application_manufacturers: ["GM"], reverse_ratio: 3.16, source: RANDYS_MUNCIE },
      { name: "66-70 Wide Ratio", gear_ratios: [2.52, 1.88, 1.46, 1.0], application_manufacturers: ["GM"], reverse_ratio: 3.11, source: RANDYS_MUNCIE },
      { name: "71-74 Wide Ratio", gear_ratios: [2.52, 1.88, 1.46, 1.0], application_manufacturers: ["GM"], reverse_ratio: 3.11, source: RANDYS_MUNCIE },
    ],
  },
  {
    manufacturer: "Richmond",
    model: "Super T-10",
    variants: [
      { name: "2.43 S", gear_ratios: [2.43, 1.61, 1.23, 1.0], application_manufacturers: ["GM"], reverse_ratio: 2.35, source: `${RICHMOND_SUPER_T10} (7021510)` },
      { name: "2.64 W", gear_ratios: [2.64, 1.75, 1.34, 1.0], application_manufacturers: ["GM"], reverse_ratio: 2.55, source: `${RICHMOND_SUPER_T10} (7021520)` },
      { name: "2.64 X", gear_ratios: [2.64, 1.6, 1.23, 1.0], application_manufacturers: ["GM"], reverse_ratio: 2.55, source: `${RICHMOND_SUPER_T10} (7021530)` },
      { name: "2.88 CC", gear_ratios: [2.88, 1.91, 1.33, 1.0], application_manufacturers: ["GM"], reverse_ratio: 2.78, source: `${RICHMOND_SUPER_T10} (7021540)` },
      { name: "3.42 Z", gear_ratios: [3.42, 2.28, 1.46, 1.0], application_manufacturers: ["GM"], reverse_ratio: 3.51, source: `${RICHMOND_SUPER_T10} (7021560)` },
    ],
  },
  {
    manufacturer: "GM",
    model: "Saginaw 4-speed",
    variants: [
      {
        name: "2.54 (1 groove)",
        gear_ratios: [2.54, 1.8, 1.44, 1.0],
        application_manufacturers: ["GM"],
        source: `${ADVANCE_SAGINAW}; Chevy Hardcore lists 2nd as 1.84: ${CHEVYHARDCORE_GM_4SPEEDS}`,
      },
      {
        name: "2.84 (no grooves)",
        gear_ratios: [2.84, 2.01, 1.35, 1.0],
        application_manufacturers: ["GM"],
        source: `${ADVANCE_SAGINAW}; Chevy Hardcore lists 3rd as 1.34: ${CHEVYHARDCORE_GM_4SPEEDS}`,
      },
      {
        name: "3.11 (2 grooves)",
        gear_ratios: [3.11, 2.2, 1.47, 1.0],
        application_manufacturers: ["GM"],
        source: `${ADVANCE_SAGINAW}; ${CHEVYHARDCORE_GM_4SPEEDS}`,
      },
      {
        name: "3.50 (3 grooves)",
        gear_ratios: [3.5, 2.47, 1.65, 1.0],
        application_manufacturers: ["GM"],
        source: `${ADVANCE_SAGINAW}; Chevy Hardcore lists 2nd as 2.46: ${CHEVYHARDCORE_GM_4SPEEDS}`,
      },
    ],
  },
  {
    manufacturer: "Nissan",
    model: "CD009",
    variants: [
      {
        name: "350Z / G35 6-speed",
        gear_ratios: [3.794, 2.324, 1.624, 1.271, 1.0, 0.794],
        application_manufacturers: ["Nissan", "Infiniti"],
        reverse_ratio: 3.446,
        source: `${MOTORMATCHUP_350Z}; ${MY350Z_RATIOS} (no Nissan factory document found; sources agree)`,
      },
    ],
  },
  {
    manufacturer: "Tremec",
    model: "TR-9080 DCT",
    dualClutch: true,
    variants: [
      {
        name: "C8 Corvette 8-speed",
        gear_ratios: [2.91, 1.76, 1.22, 0.88, 0.65, 0.51, 0.4, 0.33],
        application_manufacturers: ["Chevrolet"],
        reverse_ratio: 2.63,
        source: `${CORVETTE_MAG_TR9080}; ${LSX_TR9080} (transaxle final drive is the axle ratio: 5.17 on the Z51 Stingray)`,
      },
    ],
  },

  {
    manufacturer: "Tremec",
    model: "TR6060",
    variants: [
      { name: "Challenger / Charger R/T, Scat Pack, 392 (2009-23)", gear_ratios: [2.97, 2.1, 1.46, 1.0, 0.74, 0.5], application_manufacturers: ["Dodge"], reverse_ratio: 2.9, source: `${TORQUENEWS_CHALLENGER}; ${WIKIPEDIA_TR6060} (Wikipedia lists reverse 3.28)` },
      { name: "Challenger Hellcat (2015-23) / Viper (2013-17)", gear_ratios: [2.26, 1.58, 1.19, 1.0, 0.77, 0.63], application_manufacturers: ["Dodge"], reverse_ratio: 2.9, source: `${TORQUENEWS_CHALLENGER}; ${WIKIPEDIA_TR6060} (Wikipedia lists 5th 0.76)` },
      { name: "Camaro SS (2010-15) / HSV (2008-13)", gear_ratios: [3.01, 2.07, 1.43, 1.0, 0.84, 0.57], application_manufacturers: ["Chevrolet", "Holden"], reverse_ratio: 3.28, source: WIKIPEDIA_TR6060 },
      { name: "Camaro ZL1 (2012-15) / CTS-V (2009-15) / CT4-V Blackwing", gear_ratios: [2.66, 1.78, 1.3, 1.0, 0.8, 0.63], application_manufacturers: ["Chevrolet", "Cadillac"], reverse_ratio: 2.9, source: WIKIPEDIA_TR6060 },
      { name: "Camaro SS / ZL1 (2016-24) / Corvette C6 (2008-13)", gear_ratios: [2.66, 1.78, 1.3, 1.0, 0.74, 0.5], application_manufacturers: ["Chevrolet"], reverse_ratio: 2.9, source: WIKIPEDIA_TR6060 },
      { name: "Corvette C6 Z51 (2008-09)", gear_ratios: [2.97, 2.07, 1.43, 1.0, 0.71, 0.57], application_manufacturers: ["Chevrolet"], reverse_ratio: 3.28, source: WIKIPEDIA_TR6060 },
      { name: "Corvette C6 ZR1 (2009-13)", gear_ratios: [2.29, 1.61, 1.21, 1.0, 0.82, 0.68], application_manufacturers: ["Chevrolet"], reverse_ratio: 3.11, source: WIKIPEDIA_TR6060 },
      { name: "CT5-V Blackwing", gear_ratios: [2.29, 1.61, 1.21, 1.0, 0.82, 0.54], application_manufacturers: ["Cadillac"], reverse_ratio: 3.11, source: WIKIPEDIA_TR6060 },
      { name: "Shelby GT500 (2007-10)", gear_ratios: [2.97, 1.78, 1.3, 1.0, 0.8, 0.63], application_manufacturers: ["Ford"], reverse_ratio: 2.9, source: `${WIKIPEDIA_TR6060}; ${MODERN_DRIVELINE_MUSTANG} (reverse 2.90 per Wikipedia, 3.28 per Modern Driveline)` },
      { name: "Shelby GT500 (2011-12)", gear_ratios: [2.97, 1.78, 1.3, 1.0, 0.74, 0.5], application_manufacturers: ["Ford"], reverse_ratio: 3.28, source: `${MODERN_DRIVELINE_MUSTANG}; ${WIKIPEDIA_TR6060} (Wikipedia lists reverse 3.98)` },
      { name: "Shelby GT500 (2013-14)", gear_ratios: [2.66, 1.82, 1.3, 1.0, 0.77, 0.5], application_manufacturers: ["Ford"], reverse_ratio: 2.9, source: `${MODERN_DRIVELINE_MUSTANG}; ${WIKIPEDIA_TR6060} (Wikipedia lists reverse 3.98)` },
      { name: "Pontiac G8 GXP (2009)", gear_ratios: [2.97, 2.1, 1.46, 1.0, 0.71, 0.56], application_manufacturers: ["Pontiac"], reverse_ratio: 3.28, source: WIKIPEDIA_TR6060 },
      { name: "Chevrolet SS (2014-17)", gear_ratios: [3.01, 2.07, 1.43, 1.0, 0.71, 0.57], application_manufacturers: ["Chevrolet"], reverse_ratio: 3.28, source: WIKIPEDIA_TR6060 },
    ],
  },
  {
    manufacturer: "Tremec",
    model: "TR-6070",
    variants: [
      { name: "Corvette C7 (2014-19)", gear_ratios: [2.66, 1.78, 1.3, 1.0, 0.74, 0.5, 0.42], application_manufacturers: ["Chevrolet"], reverse_ratio: 2.9, source: WIKIPEDIA_TR6070 },
      { name: "Corvette C7 Z51 / Grand Sport", gear_ratios: [2.97, 2.07, 1.43, 1.0, 0.71, 0.57, 0.48], application_manufacturers: ["Chevrolet"], reverse_ratio: 2.9, source: WIKIPEDIA_TR6070 },
      { name: "Corvette C7 Z06 / ZR1 (2015-19)", gear_ratios: [2.29, 1.61, 1.21, 1.0, 0.82, 0.68, 0.45], application_manufacturers: ["Chevrolet"], reverse_ratio: 2.7, source: WIKIPEDIA_TR6070 },
    ],
  },
  {
    manufacturer: "Tremec",
    model: "TR-3160",
    variants: [
      { name: "Mustang GT350 / Mach 1 / Dark Horse (2016+)", gear_ratios: [3.25, 2.23, 1.61, 1.24, 1.0, 0.63], application_manufacturers: ["Ford"], reverse_ratio: 2.95, source: `${WIKIPEDIA_TR3160}; ${MODERN_DRIVELINE_MUSTANG}` },
      { name: "Camaro 2.0T / V6 (2016-24)", gear_ratios: [4.4, 2.59, 1.8, 1.34, 1.0, 0.75], application_manufacturers: ["Chevrolet"], reverse_ratio: 3.99, source: WIKIPEDIA_TR3160 },
      { name: "Cadillac ATS", gear_ratios: [4.12, 2.62, 1.81, 1.3, 1.0, 0.8], application_manufacturers: ["Cadillac"], reverse_ratio: 3.75, source: WIKIPEDIA_TR3160 },
    ],
  },
  {
    manufacturer: "Getrag",
    model: "MT82",
    variants: [
      { name: "Mustang GT 5.0 (2011-17)", gear_ratios: [3.66, 2.43, 1.69, 1.31, 1.0, 0.65], application_manufacturers: ["Ford"], reverse_ratio: 3.32, source: `${FORD_MUSTANG_2014_MANUAL}; ${MODERN_DRIVELINE_MUSTANG} (Modern Driveline rounds 4th to 1.32)` },
      { name: "Mustang V6 (2011-14)", gear_ratios: [4.24, 2.54, 1.66, 1.24, 1.0, 0.7], application_manufacturers: ["Ford"], reverse_ratio: 3.84, source: FORD_MUSTANG_2014_MANUAL },
      { name: "Mustang EcoBoost (2015-23)", gear_ratios: [4.236, 2.538, 1.665, 1.238, 1.0, 0.704], application_manufacturers: ["Ford"], reverse_ratio: 3.84, source: `${FORD_2016_MUSTANG_SPECS} (reverse from the V6 manual: ${FORD_MUSTANG_2014_MANUAL})` },
      { name: "MT82-D4 Mustang GT (2018+)", gear_ratios: [3.237, 2.104, 1.422, 1.0, 0.814, 0.622], application_manufacturers: ["Ford"], reverse_ratio: null, source: `${FORD_2024_MUSTANG_SPECS}; ${MUSTANG6G_D4} (reverse not found)` },
    ],
  },
  {
    manufacturer: "GM",
    model: "Muncie M21",
    variants: [
      { name: "Close Ratio (1963-74)", gear_ratios: [2.2, 1.64, 1.28, 1.0], application_manufacturers: ["GM"], reverse_ratio: 2.27, source: RANDYS_MUNCIE },
    ],
  },
  {
    manufacturer: "GM",
    model: "Muncie M22",
    variants: [
      { name: "Rock Crusher (1967-74)", gear_ratios: [2.2, 1.64, 1.28, 1.0], application_manufacturers: ["GM"], reverse_ratio: 2.27, source: RANDYS_MUNCIE },
    ],
  },
  {
    manufacturer: "Ford",
    model: "Toploader",
    variants: [
      { name: "Close Ratio (1964-73)", gear_ratios: [2.32, 1.69, 1.29, 1.0], application_manufacturers: ["Ford", "Mercury"], reverse_ratio: null, source: `${WIKIPEDIA_TOPLOADER}; ${MACS_TOPLOADER} (reverse not found)` },
      { name: "Wide Ratio (1964-73)", gear_ratios: [2.78, 1.93, 1.36, 1.0], application_manufacturers: ["Ford", "Mercury"], reverse_ratio: null, source: `${WIKIPEDIA_TOPLOADER}; ${MACS_TOPLOADER} (reverse not found)` },
    ],
  },
  {
    manufacturer: "Chrysler",
    model: "A833",
    variants: [
      { name: "Close Ratio (340 / 383 / 440 / Hemi)", gear_ratios: [2.44, 1.77, 1.34, 1.0], application_manufacturers: ["Dodge", "Plymouth"], reverse_ratio: null, source: `${GEARVENDORS_A833} (reverse not found)` },
      { name: "Wide Ratio (1964-79)", gear_ratios: [2.66, 1.91, 1.39, 1.0], application_manufacturers: ["Dodge", "Plymouth"], reverse_ratio: null, source: `${GEARVENDORS_A833} (reverse not found)` },
      { name: "Extra Wide (1964-66 A-body)", gear_ratios: [3.09, 1.92, 1.4, 1.0], application_manufacturers: ["Dodge", "Plymouth"], reverse_ratio: null, source: `${GEARVENDORS_A833} (reverse not found)` },
      { name: "Overdrive (1975-79 A-body)", gear_ratios: [3.09, 1.67, 1.0, 0.73], application_manufacturers: ["Dodge", "Plymouth"], reverse_ratio: null, source: `${GEARVENDORS_A833} (reverse not found)` },
    ],
  },
  {
    manufacturer: "Borg-Warner",
    model: "T-10",
    variants: [
      { name: "U set", gear_ratios: [3.42, 2.28, 1.46, 1.0], application_manufacturers: ["GM", "Ford", "AMC"], reverse_ratio: 3.33, source: ADVANCE_T10 },
      { name: "W set", gear_ratios: [2.64, 1.75, 1.33, 1.0], application_manufacturers: ["GM", "Ford", "AMC"], reverse_ratio: 2.71, source: ADVANCE_T10 },
      { name: "X set", gear_ratios: [2.43, 1.61, 1.23, 1.0], application_manufacturers: ["GM", "Ford", "AMC"], reverse_ratio: 2.49, source: ADVANCE_T10 },
      { name: "Y set", gear_ratios: [2.88, 1.75, 1.33, 1.0], application_manufacturers: ["GM", "Ford", "AMC"], reverse_ratio: 2.49, source: ADVANCE_T10 },
    ],
  },
  {
    manufacturer: "Doug Nash",
    model: "4+3",
    variants: [
      { name: "Corvette C4 (1984-88), overdrive off", gear_ratios: [2.88, 1.91, 1.33, 1.0], application_manufacturers: ["Chevrolet"], reverse_ratio: 2.78, source: `${RICHMOND_SUPER_T10} (2.88 CC set: the 4+3 core); ${CORVETTEFORUM_4PLUS3}` },
    ],
  },
  {
    manufacturer: "ZF",
    model: "S6-40",
    variants: [
      { name: "Corvette C4 ZF6 (1989-96)", gear_ratios: [2.68, 1.8, 1.29, 1.0, 0.75, 0.5], application_manufacturers: ["Chevrolet"], reverse_ratio: 2.5, source: CORVETTEFORUM_ZF6 },
    ],
  },
  {
    manufacturer: "Toyota",
    model: "W58",
    variants: [
      { name: "Supra A60 / A70 / A80 non-turbo, SC300", gear_ratios: [3.285, 1.894, 1.275, 1.0, 0.783], application_manufacturers: ["Toyota", "Lexus"], reverse_ratio: 3.768, source: WIKIPEDIA_TOYOTA_W },
    ],
  },
  {
    manufacturer: "Toyota",
    model: "R154",
    variants: [
      { name: "Supra A70 Turbo (1987-92), JZ chassis", gear_ratios: [3.251, 1.955, 1.31, 1.0, 0.753], application_manufacturers: ["Toyota"], reverse_ratio: 3.18, source: WIKIPEDIA_TOYOTA_R },
    ],
  },
  {
    manufacturer: "Getrag",
    model: "V160 / V161",
    variants: [
      { name: "V160 Supra A80 Twin Turbo", gear_ratios: [3.827, 2.36, 1.685, 1.312, 1.0, 0.793], application_manufacturers: ["Toyota"], reverse_ratio: 3.28, source: MKIVSUPRA_V160 },
      { name: "V161 (later JDM)", gear_ratios: [3.724, 2.246, 1.541, 1.205, 1.0, 0.818], application_manufacturers: ["Toyota"], reverse_ratio: 3.192, source: `${MKIVSUPRA_V160} (which markets and years got the V161 is unconfirmed)` },
    ],
  },
  {
    manufacturer: "Mazda",
    model: "RX-7 5-speed",
    variants: [
      { name: "FD3S (1992-2002) / FC3S Turbo II (1987-91)", gear_ratios: [3.483, 2.015, 1.391, 1.0, 0.719], application_manufacturers: ["Mazda"], reverse_ratio: 3.288, source: `${RX7NZ_JDM_SPEC}; ${JDMBUYSELL_FC} (FC Turbo II shares 1st-4th; its 5th from forum lists)` },
    ],
  },
  {
    manufacturer: "Subaru",
    model: "TY856 STI 6-speed",
    variants: [
      { name: "STI (2004-07)", gear_ratios: [3.636, 2.375, 1.761, 1.346, 0.971, 0.756], application_manufacturers: ["Subaru"], reverse_ratio: 3.545, source: SUBARU_2004_MANUAL },
      { name: "STI (2008+)", gear_ratios: [3.636, 2.235, 1.521, 1.137, 0.971, 0.756], application_manufacturers: ["Subaru"], reverse_ratio: 3.545, source: SUBARU_2012_WRX_STI },
    ],
  },
  {
    manufacturer: "Subaru",
    model: "TY75 WRX 5-speed",
    variants: [
      { name: "WRX 2.0T (2002-05)", gear_ratios: [3.454, 1.947, 1.366, 0.972, 0.738], application_manufacturers: ["Subaru"], reverse_ratio: 3.333, source: SUBARU_2004_MANUAL },
      { name: "WRX (2008-14)", gear_ratios: [3.166, 1.882, 1.296, 0.972, 0.738], application_manufacturers: ["Subaru"], reverse_ratio: 3.333, source: SUBARU_2012_WRX_STI },
    ],
  },
  {
    manufacturer: "Subaru",
    model: "WRX 6-speed",
    variants: [
      { name: "WRX (2015-21)", gear_ratios: [3.454, 1.947, 1.296, 0.972, 0.78, 0.666], application_manufacturers: ["Subaru"], reverse_ratio: 3.636, source: SUBARU_2018_WRX },
    ],
  },
  {
    manufacturer: "Toyota",
    model: "TL70",
    variants: [
      { name: "BRZ / FR-S / GT86 (2013-20)", gear_ratios: [3.626, 2.188, 1.541, 1.213, 1.0, 0.767], application_manufacturers: ["Subaru", "Toyota", "Scion"], reverse_ratio: 3.437, source: SUBARU_2013_BRZ },
    ],
  },
  {
    manufacturer: "Honda",
    model: "K-series manual",
    variants: [
      { name: "Civic Si EP3 5-speed (2002-05)", gear_ratios: [3.062, 1.769, 1.212, 0.921, 0.738], application_manufacturers: ["Honda"], reverse_ratio: 3.583, source: HYBRID_RACING_K },
      { name: "RSX base 5-speed (2002-04)", gear_ratios: [3.266, 1.88, 1.212, 0.921, 0.738], application_manufacturers: ["Acura"], reverse_ratio: 3.583, source: HYBRID_RACING_K },
      { name: "RSX Type-S 6-speed (2002-06)", gear_ratios: [3.266, 2.13, 1.517, 1.147, 0.921, 0.738], application_manufacturers: ["Acura"], reverse_ratio: 3.583, source: HYBRID_RACING_K },
      { name: "Civic Si FA5 / FG2 6-speed (2006-11)", gear_ratios: [3.267, 2.13, 1.517, 1.147, 0.921, 0.659], application_manufacturers: ["Honda"], reverse_ratio: 3.583, source: HYBRID_RACING_K },
      { name: "JDM DC5 / EP3 Type R 6-speed", gear_ratios: [3.266, 2.13, 1.517, 1.212, 0.972, 0.78], application_manufacturers: ["Honda", "Acura"], reverse_ratio: 3.583, source: HYBRID_RACING_K },
      { name: "TSX 6-speed (2004-08)", gear_ratios: [3.266, 1.88, 1.354, 1.027, 0.825, 0.659], application_manufacturers: ["Acura"], reverse_ratio: 3.583, source: HYBRID_RACING_K },
    ],
  },
  {
    manufacturer: "Honda",
    model: "B-series manual",
    variants: [
      { name: "Integra Type R / Civic Si (B16)", gear_ratios: [3.23, 2.105, 1.458, 1.107, 0.848], application_manufacturers: ["Honda", "Acura"], reverse_ratio: 3.0, source: `${HONDATECH_B} (Type R final drive disputed: 4.40 vs 4.785)` },
      { name: "Integra GSR (1994-2001)", gear_ratios: [3.23, 1.9, 1.36, 1.034, 0.787], application_manufacturers: ["Acura"], reverse_ratio: 3.0, source: HONDATECH_B },
      { name: "Integra LS (B18B1)", gear_ratios: [3.23, 1.9, 1.269, 0.966, 0.714], application_manufacturers: ["Acura"], reverse_ratio: 3.0, source: HONDATECH_B },
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
      { name: "1.58 Low (aftermarket)", gear_ratios: [1.58, 1.0], application_manufacturers: ["GM"], source: ATI_GLIDE_GEARSETS },
      { name: "1.62 Low (aftermarket)", gear_ratios: [1.62, 1.0], application_manufacturers: ["GM"], source: ATI_GLIDE_GEARSETS },
      { name: "1.64 Low (aftermarket)", gear_ratios: [1.64, 1.0], application_manufacturers: ["GM"], source: ATI_GLIDE_GEARSETS },
      { name: "1.74 Low (aftermarket)", gear_ratios: [1.74, 1.0], application_manufacturers: ["GM"], source: ATI_GLIDE_GEARSETS },
      { name: "1.80 Low (aftermarket)", gear_ratios: [1.8, 1.0], application_manufacturers: ["GM"], source: ATI_GLIDE_GEARSETS },
      { name: "1.87 Low (aftermarket)", gear_ratios: [1.87, 1.0], application_manufacturers: ["GM"], source: ATI_GLIDE_GEARSETS },
      { name: "1.94 Low (aftermarket)", gear_ratios: [1.94, 1.0], application_manufacturers: ["GM"], source: ATI_GLIDE_GEARSETS },
      { name: "1.98 Low (aftermarket)", gear_ratios: [1.98, 1.0], application_manufacturers: ["GM"], source: ATI_GLIDE_GEARSETS },
      { name: "2.08 Low (aftermarket)", gear_ratios: [2.08, 1.0], application_manufacturers: ["GM"], source: ATI_GLIDE_GEARSETS },
      { name: "2.18 Low (aftermarket)", gear_ratios: [2.18, 1.0], application_manufacturers: ["GM"], source: ATI_GLIDE_GEARSETS },
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
    manufacturer: "Ford",
    model: "AOD",
    kind: "automatic",
    // 4th is a direct mechanical drive through the split-torque input shaft (locked); 3rd's 60/40 split isn't modelled.
    automatic: automaticDefaults({ stallRpm: 2800, couplingSlip: 0.06, lockupCapable: true, lockup: "top", shiftTimeS: 0.22, shiftLoss: 0.15, drivetrainLoss: 0.15 }),
    variants: [
      { name: "AOD / AODE", gear_ratios: [2.4, 1.47, 1.0, 0.67], application_manufacturers: ["Ford", "Lincoln", "Mercury"], reverse_ratio: 2.0, source: `${FORD_AOD_MANUAL}; ${F150HUB_AOD}` },
    ],
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
  {
    manufacturer: "ZF",
    model: "8HP45",
    kind: "automatic",
    automatic: automaticDefaults({ stallRpm: 2400, couplingSlip: 0.04, lockupCapable: true, lockup: "after1st", shiftTimeS: 0.15, shiftLoss: 0.1, drivetrainLoss: 0.11 }),
    variants: [
      {
        name: "8HP45 (2010+)",
        gear_ratios: [4.714, 3.143, 2.106, 1.667, 1.285, 1.0, 0.839, 0.667],
        application_manufacturers: ["BMW", "Chrysler", "Dodge", "Jeep", "Ram", "Audi"],
        reverse_ratio: 3.317,
        source: `${WIKIPEDIA_8HP}; ${FCPEURO_8HP45} (same gearset as the 8HP70; FCP Euro lists reverse 3.30)`,
      },
    ],
  },
  {
    manufacturer: "Chrysler",
    model: "727 TorqueFlite",
    kind: "automatic",
    automatic: automaticDefaults({ stallRpm: 3000, couplingSlip: 0.06, lockupCapable: false, shiftTimeS: 0.2, shiftLoss: 0.2, drivetrainLoss: 0.14 }),
    variants: [
      { name: "A727", gear_ratios: [2.45, 1.45, 1.0], application_manufacturers: ["Chrysler", "Dodge", "Plymouth", "Jeep"], reverse_ratio: 2.2, source: `${WIKIPEDIA_TORQUEFLITE}; ${DIESELHUB_727} (some sources list reverse 2.21)` },
    ],
  },
  {
    manufacturer: "Chrysler",
    model: "545RFE",
    kind: "automatic",
    automatic: automaticDefaults({ stallRpm: 2400, couplingSlip: 0.06, lockupCapable: true, lockup: "off", shiftTimeS: 0.22, shiftLoss: 0.15, drivetrainLoss: 0.14 }),
    variants: [
      {
        name: "545RFE",
        gear_ratios: [3.0, 1.67, 1.0, 0.75, 0.67],
        application_manufacturers: ["Dodge", "Jeep", "Ram"],
        reverse_ratio: 3.0,
        source: `${WIKIPEDIA_RFE}; ${GEARSTAR_545RFE} (upshift sequence; the 1.50 2nd prime is used on kickdowns only)`,
      },
    ],
  },
  {
    manufacturer: "Chrysler",
    model: "65RFE",
    kind: "automatic",
    automatic: automaticDefaults({ stallRpm: 2400, couplingSlip: 0.06, lockupCapable: true, lockup: "off", shiftTimeS: 0.22, shiftLoss: 0.15, drivetrainLoss: 0.15 }),
    variants: [
      {
        name: "Drive (5 upshifts)",
        gear_ratios: [3.0, 1.67, 1.0, 0.75, 0.67],
        application_manufacturers: ["Dodge", "Jeep", "Ram"],
        reverse_ratio: 3.0,
        source: `${WIKIPEDIA_RFE}; ${CARS_65RFE} (in Drive it shifts like a 545RFE; 1.50 2nd prime on kickdowns)`,
      },
      {
        name: "All six (ERS)",
        gear_ratios: [3.0, 1.67, 1.5, 1.0, 0.75, 0.67],
        application_manufacturers: ["Dodge", "Jeep", "Ram"],
        reverse_ratio: 3.0,
        source: `${WIKIPEDIA_RFE}; ${CARS_65RFE} (Electronic Range Select uses all six ratios in sequence)`,
      },
    ],
  },
  {
    manufacturer: "Ford",
    model: "10R80",
    kind: "automatic",
    automatic: automaticDefaults({ stallRpm: 2400, couplingSlip: 0.04, lockupCapable: true, lockup: "after1st", shiftTimeS: 0.15, shiftLoss: 0.1, drivetrainLoss: 0.12 }),
    variants: [
      {
        name: "10R80 (2017+)",
        gear_ratios: [4.696, 2.985, 2.146, 1.769, 1.52, 1.275, 1.0, 0.854, 0.689, 0.636],
        application_manufacturers: ["Ford", "Lincoln"],
        reverse_ratio: 4.866,
        source: WIKIPEDIA_10SPEED,
      },
    ],
  },
  {
    manufacturer: "GM",
    model: "8L90",
    kind: "automatic",
    automatic: automaticDefaults({ stallRpm: 2400, couplingSlip: 0.04, lockupCapable: true, lockup: "after1st", shiftTimeS: 0.15, shiftLoss: 0.1, drivetrainLoss: 0.12 }),
    variants: [
      { name: "Hydra-Matic 8L90", gear_ratios: [4.56, 2.97, 2.08, 1.69, 1.27, 1.0, 0.85, 0.65], application_manufacturers: ["Chevrolet", "GMC", "Cadillac"], reverse_ratio: 3.82, source: `${GM_8L90}; ${CARS_8L90}` },
    ],
  },
  {
    manufacturer: "GM",
    model: "200-4R",
    kind: "automatic",
    // Lock-up clutch in 3rd/4th; stock calibrations unlock at wide-open throttle.
    automatic: automaticDefaults({ stallRpm: 2800, couplingSlip: 0.06, lockupCapable: true, lockup: "off", shiftTimeS: 0.2, shiftLoss: 0.2, drivetrainLoss: 0.14 }),
    variants: [
      { name: "THM 200-4R", gear_ratios: [2.74, 1.57, 1.0, 0.67], application_manufacturers: ["Buick", "Chevrolet", "Oldsmobile", "Pontiac", "Cadillac"], reverse_ratio: 2.07, source: `${TH700R4HQ_2004R}; ${ITSTILLRUNS_2004R}` },
    ],
  },
  {
    manufacturer: "GM",
    model: "6L80",
    kind: "automatic",
    automatic: automaticDefaults({ stallRpm: 2800, couplingSlip: 0.05, lockupCapable: true, lockup: "off", shiftTimeS: 0.18, shiftLoss: 0.12, drivetrainLoss: 0.13 }),
    variants: [
      { name: "Hydra-Matic 6L80", gear_ratios: [4.03, 2.36, 1.53, 1.15, 0.85, 0.67], application_manufacturers: ["Chevrolet", "GMC", "Cadillac", "Pontiac"], reverse_ratio: 3.06, source: `${GM_6L80_SPECS}; ${JEGS_6L80}` },
    ],
  },
  {
    manufacturer: "Mercedes-Benz",
    model: "NAG1",
    kind: "automatic",
    automatic: automaticDefaults({ stallRpm: 2800, couplingSlip: 0.06, lockupCapable: true, lockup: "off", shiftTimeS: 0.2, shiftLoss: 0.15, drivetrainLoss: 0.13 }),
    variants: [
      {
        name: "W5A580 (Chrysler / Dodge / Jeep)",
        gear_ratios: [3.59, 2.19, 1.41, 1.0, 0.83],
        application_manufacturers: ["Chrysler", "Dodge", "Jeep", "Mercedes-Benz"],
        reverse_ratio: 3.16,
        source: `${WIKIPEDIA_5GTRONIC}; ${GEARSTAR_NAG1} (Chrysler gearset; reverse 1 3.16, some list 3.17)`,
      },
    ],
  },
  {
    manufacturer: "Ford",
    model: "6R80",
    kind: "automatic",
    automatic: automaticDefaults({ stallRpm: 2800, couplingSlip: 0.05, lockupCapable: true, lockup: "off", shiftTimeS: 0.18, shiftLoss: 0.12, drivetrainLoss: 0.13 }),
    variants: [
      { name: "6R80 (2011-17 Mustang, F-150)", gear_ratios: [4.171, 2.34, 1.521, 1.143, 0.867, 0.691], application_manufacturers: ["Ford", "Lincoln"], reverse_ratio: 3.403, source: WIKIPEDIA_6R },
    ],
  },
  {
    manufacturer: "Aisin",
    model: "A340E",
    kind: "automatic",
    automatic: automaticDefaults({ stallRpm: 2800, couplingSlip: 0.06, lockupCapable: true, lockup: "off", shiftTimeS: 0.22, shiftLoss: 0.15, drivetrainLoss: 0.13 }),
    variants: [
      { name: "Supra A70 / A80, SC300 / SC400", gear_ratios: [2.804, 1.531, 1.0, 0.705], application_manufacturers: ["Toyota", "Lexus"], reverse_ratio: 2.393, source: WIKIPEDIA_TOYOTA_A },
    ],
  },
  {
    manufacturer: "Chrysler",
    model: "A904 TorqueFlite",
    kind: "automatic",
    automatic: automaticDefaults({ stallRpm: 3000, couplingSlip: 0.06, lockupCapable: false, shiftTimeS: 0.2, shiftLoss: 0.2, drivetrainLoss: 0.13 }),
    variants: [
      { name: "A904 standard", gear_ratios: [2.45, 1.45, 1.0], application_manufacturers: ["Chrysler", "Dodge", "Plymouth"], reverse_ratio: 2.2, source: `${WIKIPEDIA_TORQUEFLITE} (some sources list reverse 2.21)` },
      { name: "Wide ratio (A904 WR / A998 / A999)", gear_ratios: [2.74, 1.54, 1.0], application_manufacturers: ["Chrysler", "Dodge", "Plymouth"], reverse_ratio: 2.2, source: `${WIKIPEDIA_TORQUEFLITE} (A998 section lists 2nd 1.55; reverse 2.20-2.21)` },
    ],
  },
  {
    manufacturer: "Ford",
    model: "FMX",
    kind: "automatic",
    automatic: automaticDefaults({ stallRpm: 3000, couplingSlip: 0.06, lockupCapable: false, shiftTimeS: 0.2, shiftLoss: 0.2, drivetrainLoss: 0.14 }),
    variants: [
      { name: "FMX (1968-79)", gear_ratios: [2.4, 1.47, 1.0], application_manufacturers: ["Ford", "Mercury"], reverse_ratio: 2.0, source: WIKIPEDIA_FMX },
    ],
  },
  {
    manufacturer: "GM",
    model: "700R4 / 4L60",
    kind: "automatic",
    automatic: automaticDefaults({ stallRpm: 2800, couplingSlip: 0.06, lockupCapable: true, lockup: "off", shiftTimeS: 0.22, shiftLoss: 0.15, drivetrainLoss: 0.13 }),
    variants: [
      { name: "700R4 / 4L60 (1982-93)", gear_ratios: [3.059, 1.625, 1.0, 0.696], application_manufacturers: ["GM"], reverse_ratio: 2.29, source: `${WIKIPEDIA_4L60} (same gearset as the 4L60E)` },
    ],
  },
  {
    manufacturer: "ZF",
    model: "8HP90",
    kind: "automatic",
    automatic: automaticDefaults({ stallRpm: 2400, couplingSlip: 0.04, lockupCapable: true, lockup: "after1st", shiftTimeS: 0.15, shiftLoss: 0.1, drivetrainLoss: 0.12 }),
    variants: [
      { name: "8HP90 (Hellcat / Redeye)", gear_ratios: [4.714, 3.143, 2.106, 1.667, 1.285, 1.0, 0.839, 0.667], application_manufacturers: ["Dodge", "Chrysler", "Jeep", "Ram"], reverse_ratio: 3.317, source: `${WIKIPEDIA_8HP}; ${TORQUENEWS_CHALLENGER} (same gearset as the 8HP70)` },
    ],
  },
  {
    manufacturer: "GM",
    model: "10L80 / 10L90",
    kind: "automatic",
    automatic: automaticDefaults({ stallRpm: 2400, couplingSlip: 0.04, lockupCapable: true, lockup: "after1st", shiftTimeS: 0.15, shiftLoss: 0.1, drivetrainLoss: 0.12 }),
    variants: [
      { name: "10L80 Camaro SS / 10L90 ZL1, CT4-V, CT5-V", gear_ratios: [4.696, 2.985, 2.146, 1.769, 1.52, 1.275, 1.0, 0.854, 0.689, 0.636], application_manufacturers: ["Chevrolet", "Cadillac"], reverse_ratio: 4.866, source: `${WIKIPEDIA_10SPEED} (same gearset as the Ford 10R80)` },
    ],
  },
];
