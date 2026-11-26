import type { VehicleSetup } from "./quarterMile";

/**
 * Body presets for the Car pane's Advanced fields only: weight split, CG height, wheelbase and aero.
 * Race weight, drive layout, tires and everything else stay as the user set them.
 *
 * Sources (see AGENTS.md "Car presets"): wheelbase, weight split and Cd are published figures where a
 * specific car is named (GM C6 spec sheets; S550 Mustang GT reviews; MotorMatchup / Car Life for the
 * muscle and pony cars; Ford F-150 specs and press release). Frontal area is estimated as
 * 0.82 × width × height; CG heights are engineering estimates (none are published). The dragster's aero
 * is an estimate too (no published data for bracket dragsters).
 */
export type CarPreset = {
  id: string;
  label: string;
  /** Share of weight on the rear axle (converted to the driven axle for front-drive cars). */
  rearWeightFraction: number;
  cgHeightIn: number;
  wheelbaseIn: number;
  dragCoefficient: number;
  frontalAreaFt2: number;
  /**
   * Side profile in a 160 × 56 box, ground at y = 52, front to the left. Traced from reference photos (F-150, C6,
   * 2020 Challenger, 1969 Nova) or drawn from one (1969 Camaro, rear-engine dragster); tyres are part of the outline.
   */
  body: string;
  /** Side glass, drawn over the body. */
  windows?: string;
  wheels: { x: number; r: number }[];
};

export const CAR_PRESETS: CarPreset[] = [
  {
    // Class average: F-150 SuperCrew 5.5 ft box (145.4 in, Cd 0.416) and Silverado crew cab (~0.41, unofficial).
    id: "truck",
    label: "Full-size truck",
    rearWeightFraction: 0.42,
    cgHeightIn: 28,
    wheelbaseIn: 145,
    dragCoefficient: 0.42,
    frontalAreaFt2: 35,
    body: "M60.4 2.0 L62.5 3.1 L83.2 2.0 L94.4 2.7 L96.1 3.8 L97.9 17.1 L154.3 16.7 L155.7 23.0 L155.7 28.6 L153.9 33.9 L157.1 34.6 L156.8 38.8 L154.6 39.9 L153.6 42.0 L150.4 41.6 L149.7 40.6 L144.5 42.0 L145.2 43.7 L135.7 42.7 L133.3 47.9 L130.5 50.4 L127.0 51.8 L122.8 51.8 L119.3 50.4 L116.4 47.9 L114.3 43.7 L35.8 43.7 L33.7 47.9 L30.9 50.4 L27.4 51.8 L21.8 51.4 L16.9 47.9 L14.8 43.7 L9.2 43.7 L8.5 42.7 L4.6 41.6 L3.2 39.9 L2.9 36.0 L5.4 30.7 L4.3 28.3 L4.6 25.1 L5.7 24.4 L5.7 21.6 L8.9 19.5 L12.4 18.8 L34.1 16.7 L38.3 15.0 L39.7 15.7 L40.7 13.9 L42.5 13.6 L44.6 11.1 L46.7 10.8 L49.5 8.0 L50.6 8.3 L53.4 6.6 L53.7 5.5 L56.5 4.1 L57.6 4.5 Z",
    windows: "M71.9 5.2 L89.5 5.5 L90.5 11.1 L90.2 16.4 L87.4 17.8 L64.9 18.1 L56.5 20.9 L43.6 20.6 L43.9 17.8 L45.3 15.7 L57.2 7.6 L62.1 5.9 Z M151.8 16.7 L153.2 17.4 L97.5 17.8 L96.8 23.0 L96.8 18.1 L97.9 17.4 Z M71.2 3.4 L92.3 3.4 L93.3 4.1 L67.0 3.8 L67.0 4.5 L69.5 4.5 L59.3 4.8 Z",
    wheels: [
      { x: 25.3, r: 10.8 },
      { x: 124.9, r: 10.8 },
    ],
  },
  {
    // 2005-13 C6 Corvette coupe: 105.7 in, 51/49, Cd 0.28 (GM); 75.9 × 49.0 in body.
    id: "c6",
    label: "Corvette",
    rearWeightFraction: 0.49,
    cgHeightIn: 17.5,
    wheelbaseIn: 105.7,
    dragCoefficient: 0.28,
    frontalAreaFt2: 21,
    body: "M93.5 6.6 L114.8 8.1 L133.5 11.7 L145.9 15.7 L157.3 16.1 L158.0 16.8 L157.3 18.7 L158.0 26.0 L156.9 35.2 L154.3 38.1 L152.5 38.8 L145.5 41.0 L144.5 33.0 L142.3 29.3 L136.8 25.3 L129.4 24.2 L122.1 26.4 L117.7 30.4 L115.5 35.5 L115.5 42.5 L46.3 42.5 L45.9 37.0 L44.5 33.3 L41.9 30.0 L37.2 27.1 L29.8 26.4 L25.1 27.8 L20.3 31.9 L18.1 36.3 L17.7 42.5 L2.0 42.5 L4.2 41.0 L4.2 38.1 L2.0 37.0 L2.0 35.5 L3.8 32.6 L6.8 30.4 L21.4 23.8 L33.9 21.6 L48.5 20.9 L54.7 21.6 L81.1 8.4 Z",
    windows: "M93.5 6.6 L114.8 8.1 L133.5 11.7 L145.9 15.7 L154.7 16.1 L130.5 15.7 L114.4 17.2 L113.7 9.9 L112.6 8.4 L105.3 7.0 L91.7 7.0 L85.1 8.4 L85.9 9.9 L95.4 8.8 L108.2 9.2 L108.2 17.9 L81.1 20.9 L77.8 20.1 L80.4 20.1 L81.1 19.4 L81.1 17.6 L78.5 16.8 L73.4 19.8 L73.4 21.2 L58.0 20.9 L56.9 21.6 L52.9 21.6 L54.7 21.6 L81.1 8.4 Z",
    wheels: [
      { x: 32.4, r: 12.5 },
      { x: 129.4, r: 12.5 },
    ],
  },
  {
    // Modern muscle: average of the 2018 Mustang GT fastback (107.1 in, 53/47, Cd ~0.35, 75.4 × 54.3 in body) and the 2020
    // Challenger R/T Scat Pack (116.2 in, 55/45, Cd 0.36, 75.7 × 57.7 in; MotorMatchup). Challenger silhouette.
    id: "mustang",
    label: "Modern Muscle",
    rearWeightFraction: 0.46,
    cgHeightIn: 21,
    wheelbaseIn: 111.7,
    dragCoefficient: 0.36,
    frontalAreaFt2: 24,
    body: "M84.4 5.1 L109.9 5.8 L114.8 7.1 L132.5 15.6 L142.3 16.6 L155.1 15.9 L154.4 18.5 L156.0 24.1 L158.0 26.4 L158.0 31.0 L155.1 40.1 L152.8 42.1 L149.2 42.4 L148.8 43.1 L139.4 43.1 L138.4 42.1 L136.7 42.1 L134.5 47.0 L131.5 49.9 L128.9 51.3 L123.7 51.9 L118.4 49.9 L115.5 47.0 L113.5 43.1 L42.2 43.1 L40.3 47.0 L37.3 49.9 L33.7 51.6 L29.5 51.9 L24.2 49.9 L21.3 47.0 L19.3 43.1 L5.6 43.1 L5.9 42.4 L2.0 35.2 L2.0 32.0 L4.0 30.0 L3.3 25.7 L6.9 23.1 L21.0 19.2 L46.8 18.2 L69.0 7.1 L74.6 5.8 Z",
    windows: "M88.7 7.8 L102.1 8.7 L109.3 13.3 L110.9 15.3 L110.3 15.6 L97.8 18.2 L96.5 18.9 L96.5 19.9 L96.2 18.5 L65.8 19.2 L64.8 20.2 L66.1 20.8 L66.1 22.5 L64.5 22.5 L61.2 20.5 L62.5 19.9 L62.5 18.2 L61.8 19.5 L55.3 19.2 L63.5 13.6 L71.7 9.4 L79.2 8.1 Z",
    wheels: [
      { x: 30.8, r: 11.5 },
      { x: 125, r: 11.5 },
    ],
  },
  {
    // Nova silhouette. Class average of 1968-72 intermediates: Chevelle 112 in, 56/44, Cd 0.42-0.47; GTO 112; Charger 117; Road Runner 116.
    id: "muscle",
    label: "Classic Muscle",
    rearWeightFraction: 0.44,
    cgHeightIn: 21,
    wheelbaseIn: 114,
    dragCoefficient: 0.45,
    frontalAreaFt2: 23,
    body: "M83.0 7.5 L94.9 7.5 L107.8 8.8 L110.4 11.2 L121.6 15.8 L147.4 21.1 L152.4 22.7 L154.4 24.4 L156.3 28.7 L155.7 31.3 L158.0 33.6 L153.7 39.6 L141.5 40.9 L138.5 42.2 L129.2 42.6 L128.3 46.9 L126.9 48.8 L123.0 51.5 L118.3 51.8 L115.0 50.5 L113.1 48.8 L111.1 44.9 L38.0 44.9 L36.0 48.5 L33.4 50.8 L30.8 51.8 L27.1 51.8 L23.5 50.2 L19.8 44.9 L14.6 44.9 L13.9 40.9 L5.3 40.9 L2.0 36.0 L2.7 34.6 L5.0 34.0 L3.0 28.0 L6.6 24.7 L19.8 22.1 L33.1 20.7 L49.3 20.7 L50.6 19.4 L52.2 19.4 L62.8 9.5 L64.5 8.8 Z",
    windows: "M74.1 12.2 L88.6 12.5 L87.3 18.1 L86.3 19.1 L86.3 22.1 L83.0 22.7 L86.6 23.1 L63.8 22.1 L63.5 21.1 L61.8 21.7 L57.5 21.1 L61.2 17.1 L60.8 16.5 L63.5 15.1 L64.1 13.8 L66.8 12.5 Z M90.9 12.5 L96.2 13.1 L102.5 17.8 L104.5 20.4 L94.5 22.4 L92.6 22.1 L91.9 22.7 L93.6 23.1 L91.6 23.4 L88.3 23.1 Z M106.4 12.8 L110.7 13.5 L113.7 16.1 L108.1 15.1 L106.1 13.5 Z",
    wheels: [
      { x: 28.9, r: 9.1 },
      { x: 120, r: 9.3 },
    ],
  },
  {
    // 1969 Camaro silhouette. Class average of 1967-70 pony cars: Camaro 108 in, 55/45, Cd 0.34 (catalog); Mustang / Firebird / Barracuda 108.
    id: "pony",
    label: "Classic Pony",
    rearWeightFraction: 0.44,
    cgHeightIn: 20,
    wheelbaseIn: 108,
    dragCoefficient: 0.4,
    frontalAreaFt2: 21,
    body: "M157.1 41.1 L158.0 31.4 L156.9 21.6 L155.4 20.8 L149.6 21.9 L136.6 20.5 L132.9 19.3 L128.3 16.5 L122.7 11.9 L116.2 8.7 L106.9 7.8 L79.1 7.6 L71.2 8.4 L67.0 13.3 L62.4 19.5 L54.9 20.4 L23.4 23.2 L12.2 24.4 L5.7 26.3 L4.3 30.0 L2.2 34.6 L5.7 41.4 L19.7 41.4 L19.7 40.3 L20.0 38.2 L20.6 36.2 L21.6 34.3 L22.8 32.6 L24.4 31.2 L26.1 30.0 L28.0 29.1 L30.1 28.6 L32.2 28.4 L34.3 28.6 L36.3 29.1 L38.2 30.0 L40.0 31.2 L41.5 32.6 L42.8 34.3 L43.7 36.2 L44.3 38.2 L44.6 40.3 L44.6 41.4 L111.7 41.4 L111.7 40.3 L111.9 38.2 L112.6 36.2 L113.5 34.3 L114.8 32.6 L116.3 31.2 L118.0 30.0 L120.0 29.1 L122.0 28.6 L124.1 28.4 L126.2 28.6 L128.2 29.1 L130.2 30.0 L131.9 31.2 L133.4 32.6 L134.7 34.3 L135.6 36.2 L136.3 38.2 L136.5 40.3 L136.5 41.4 Z",
    windows: "M109.5 19.7 L99.0 12.3 L98.9 21.0 Z M97.6 11.5 L73.5 11.0 L63.7 19.5 L97.6 21.2 Z",
    wheels: [
      { x: 32.2, r: 11.1 },
      { x: 124.1, r: 11.1 },
    ],
  },
  {
    // Rear-engine bracket dragster: ~230 in wheelbase, ~75% rear; CG ~10-12 in (scale method example); aero estimated.
    id: "dragster",
    label: "Dragster",
    rearWeightFraction: 0.75,
    cgHeightIn: 12,
    wheelbaseIn: 230,
    dragCoefficient: 0.5,
    frontalAreaFt2: 9,
    body: "M124.7 42.8 L121.9 37.8 L117.8 37.3 L117.8 32.3 L114.1 32.3 L114.1 27.3 L108.0 27.3 L106.6 32.3 L104.7 32.3 L104.1 37.3 L100.3 37.8 L99.7 35.1 L90.8 35.1 L89.2 39.0 L8.1 45.6 L2.0 47.8 L3.9 50.3 L124.7 52.0 Z M154.4 9.8 L139.7 12.3 L139.1 18.4 L152.4 18.4 Z M143.0 18.4 L141.3 18.4 L130.8 34.0 L132.5 34.0 Z M140.2 18.4 L138.6 18.4 L126.9 32.3 L128.6 32.3 Z M158.0 47.0 L124.7 48.4 L124.7 50.1 L158.0 48.7 Z",
    wheels: [
      { x: 12.5, r: 5.3 },
      { x: 133.9, r: 10.0 },
    ],
  },
];

/** The Advanced fields a preset sets, for this drive layout. */
export function presetPatch(preset: CarPreset, drive: VehicleSetup["drive"]): Partial<VehicleSetup> {
  return {
    // AWD ignores the split; front drive carries the front share.
    driveWeightFraction: drive === "front" ? Math.round((1 - preset.rearWeightFraction) * 100) / 100 : preset.rearWeightFraction,
    cgHeightIn: preset.cgHeightIn,
    wheelbaseIn: preset.wheelbaseIn,
    dragCoefficient: preset.dragCoefficient,
    frontalAreaFt2: preset.frontalAreaFt2,
  };
}

/** The preset whose values the car's Advanced fields currently match, if any. */
export function matchingPreset(vehicle: VehicleSetup): CarPreset | undefined {
  return CAR_PRESETS.find((preset) => {
    const patch = presetPatch(preset, vehicle.drive);
    return (Object.keys(patch) as (keyof VehicleSetup)[]).every(
      (key) => key === "driveWeightFraction" && vehicle.drive === "awd" ? true : Math.abs((vehicle[key] as number) - (patch[key] as number)) < 1e-9,
    );
  });
}
