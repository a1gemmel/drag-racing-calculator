from dataclasses import dataclass
from math import pi
from typing import Dict, List, Tuple


MILES_PER_HOUR_PER_INCH_PER_MINUTE = 60 / (12 * 5280)


@dataclass(frozen=True)
class GearSpeed:
    gear: str
    ratio: float
    speed_mph: float


def total_ratio(
    transmission_ratio: float,
    axle_ratio: float,
    transfer_case_ratios: Tuple[float, ...] = (),
) -> float:
    """Return the combined reduction through the drivetrain."""
    if transmission_ratio <= 0 or axle_ratio <= 0:
        raise ValueError("Transmission and axle ratios must be positive")
    if any(ratio <= 0 for ratio in transfer_case_ratios):
        raise ValueError("Transfer-case ratios must be positive")
    result = transmission_ratio * axle_ratio
    for ratio in transfer_case_ratios:
        result *= ratio
    return result


def speed_mph(
    engine_rpm: float,
    tire_diameter_in: float,
    transmission_ratio: float,
    axle_ratio: float,
    transfer_case_ratios: Tuple[float, ...] = (),
) -> float:
    """Calculate vehicle speed for a given engine speed and drivetrain."""
    if engine_rpm < 0:
        raise ValueError("Engine RPM cannot be negative")
    if tire_diameter_in <= 0:
        raise ValueError("Tire diameter must be positive")
    tire_circumference_in = tire_diameter_in * pi
    wheel_rpm = engine_rpm / total_ratio(
        transmission_ratio, axle_ratio, transfer_case_ratios
    )
    inches_per_minute = wheel_rpm * tire_circumference_in
    return inches_per_minute * MILES_PER_HOUR_PER_INCH_PER_MINUTE


def gear_speeds(
    engine_rpm: float,
    tire_diameter_in: float,
    gear_ratios: Dict[str, float],
    axle_ratio: float,
    transfer_case_ratios: Tuple[float, ...] = (),
) -> List[GearSpeed]:
    """Return chart-ready speeds while preserving the configured gear order."""
    return [
        GearSpeed(
            gear=gear,
            ratio=ratio,
            speed_mph=speed_mph(
                engine_rpm,
                tire_diameter_in,
                ratio,
                axle_ratio,
                transfer_case_ratios,
            ),
        )
        for gear, ratio in gear_ratios.items()
    ]