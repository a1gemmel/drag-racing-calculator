import pytest

from backend.calculations import gear_speeds, speed_mph, total_ratio


def test_speed_matches_representative_first_gear_case() -> None:
    result = speed_mph(6000, 26, 3.27, 4.10)

    assert result == pytest.approx(34.6, abs=0.1)


def test_transfer_cases_are_additional_ratio_stages() -> None:
    assert total_ratio(3.27, 4.10, (2.0, 1.5)) == pytest.approx(40.221)


def test_gear_speeds_preserve_input_order() -> None:
    results = gear_speeds(6000, 26, {"1": 3.27, "2": 1.98}, 4.10)

    assert [result.gear for result in results] == ["1", "2"]
    assert results[0].speed_mph < results[1].speed_mph


def test_invalid_ratio_is_rejected() -> None:
    with pytest.raises(ValueError, match="positive"):
        total_ratio(0, 4.10)