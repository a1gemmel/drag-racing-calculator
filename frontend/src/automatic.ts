/**
 * Automatic transmission and torque converter settings. Every transmission marked automatic in the
 * catalog carries defaults; the user can change them per transmission in the Automatic pane.
 */

export type LockupMode = "off" | "top" | "after1st";
export type LaunchMethod = "transbrake" | "footbrake";

export type AutomaticSetup = {
  /** Converter stall speed, rpm: where the converter, with the turbine held still, absorbs full engine torque. */
  stallRpm: number;
  /** Torque multiplication at stall (turbine still), e.g. 2.0. Falls linearly to 1.0 at the coupling point. */
  stallTorqueRatio: number;
  /** Converter slip at full throttle near peak power, as a fraction (0.05 = 5%): sets how loose the coupling phase is. */
  couplingSlip: number;
  /** Converter lock-up under full throttle. */
  lockup: LockupMode;
  /** Whether the transmission has a lock-up clutch at all (lock-up stays off if not). */
  lockupCapable: boolean;
  launch: LaunchMethod;
  /** Trans-brake (or 2-step) launch rpm. Capped at the stall speed: the turbine is held still. */
  transbrakeRpm: number;
  /** RPM the foot brake can hold before the car moves. Capped at the stall speed. */
  footbrakeRpm: number;
  /**
   * Upshift duration, s. Automatics power-shift: drive continues through the new gear while the shift
   * clutches pull the input speed down to the new gear.
   */
  shiftTimeS: number;
  /** Fraction of drive lost in the shift clutches while a shift is under way (overlap and slip). */
  shiftLoss: number;
  /** Mechanical/pump loss between crank and wheels, excluding converter slip (modelled separately). */
  drivetrainLoss: number;
};

/** Defaults for a custom automatic, and the base the catalog entries vary from. */
export const GENERIC_AUTOMATIC: AutomaticSetup = {
  stallRpm: 3000,
  stallTorqueRatio: 2.0,
  couplingSlip: 0.06,
  lockup: "off",
  lockupCapable: true,
  launch: "transbrake",
  transbrakeRpm: 3000,
  footbrakeRpm: 2200,
  shiftTimeS: 0.2,
  shiftLoss: 0.15,
  drivetrainLoss: 0.13,
};

/** Defaults with launch rpms tied to the stall speed: trans brake at stall, foot brake at 75% of it. */
export function automaticDefaults(overrides: Partial<AutomaticSetup>): AutomaticSetup {
  const setup = { ...GENERIC_AUTOMATIC, ...overrides };
  return {
    ...setup,
    transbrakeRpm: overrides.transbrakeRpm ?? setup.stallRpm,
    footbrakeRpm: overrides.footbrakeRpm ?? Math.round((setup.stallRpm * 0.75) / 100) * 100,
  };
}

/** Engine rpm at the moment of launch for this setup. */
export function launchRpm(setup: AutomaticSetup): number {
  return Math.min(setup.launch === "transbrake" ? setup.transbrakeRpm : setup.footbrakeRpm, setup.stallRpm);
}

/** Whether the converter is locked in this gear (0-based) with this setup. */
export function lockedInGear(setup: AutomaticSetup, gear: number, gearCount: number): boolean {
  if (!setup.lockupCapable || setup.lockup === "off") return false;
  if (setup.lockup === "top") return gear === gearCount - 1;
  return gear >= 1;
}
