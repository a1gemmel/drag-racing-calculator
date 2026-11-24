export const MILES_PER_HOUR_PER_INCH_PER_MINUTE = 60 / (12 * 5280);

export type GearSpeed = {
  gear: string;
  ratio: number;
  speed_mph: number;
};

export function totalRatio(
  transmissionRatio: number,
  axleRatio: number,
  transferCaseRatios: number[] = [],
): number {
  if (transmissionRatio <= 0 || axleRatio <= 0) {
    throw new Error("Transmission and axle ratios must be positive");
  }
  if (transferCaseRatios.some((ratio) => ratio <= 0)) {
    throw new Error("Transfer-case ratios must be positive");
  }

  return transferCaseRatios.reduce(
    (result, ratio) => result * ratio,
    transmissionRatio * axleRatio,
  );
}

export function speedMph(
  engineRpm: number,
  tireDiameterIn: number,
  transmissionRatio: number,
  axleRatio: number,
  transferCaseRatios: number[] = [],
): number {
  if (engineRpm < 0) {
    throw new Error("Engine RPM cannot be negative");
  }
  if (tireDiameterIn <= 0) {
    throw new Error("Tire diameter must be positive");
  }

  const wheelRpm = engineRpm / totalRatio(
    transmissionRatio,
    axleRatio,
    transferCaseRatios,
  );
  return wheelRpm * tireDiameterIn * Math.PI * MILES_PER_HOUR_PER_INCH_PER_MINUTE;
}

export function rpmForSpeed(
  speedMphValue: number,
  tireDiameterIn: number,
  transmissionRatio: number,
  axleRatio: number,
  transferCaseRatios: number[] = [],
): number {
  if (speedMphValue < 0) {
    throw new Error("Vehicle speed cannot be negative");
  }
  if (tireDiameterIn <= 0) {
    throw new Error("Tire diameter must be positive");
  }

  return speedMphValue * totalRatio(
    transmissionRatio,
    axleRatio,
    transferCaseRatios,
  ) / (tireDiameterIn * Math.PI * MILES_PER_HOUR_PER_INCH_PER_MINUTE);
}

export function gearSpeeds(
  engineRpm: number,
  tireDiameterIn: number,
  gearRatios: Record<string, number>,
  axleRatio: number,
  transferCaseRatios: number[] = [],
): GearSpeed[] {
  return Object.entries(gearRatios).map(([gear, ratio]) => ({
    gear,
    ratio,
    speed_mph: speedMph(
      engineRpm,
      tireDiameterIn,
      ratio,
      axleRatio,
      transferCaseRatios,
    ),
  }));
}