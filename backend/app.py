import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
import uvicorn

from backend.calculations import gear_speeds


class TransmissionVariant(BaseModel):
    name: str
    gear_ratios: List[float]
    application_manufacturers: List[str] = Field(default_factory=list)
    reverse_ratio: Optional[float] = None


class TransmissionFamily(BaseModel):
    manufacturer: str
    model: str
    variants: List[TransmissionVariant]


TRANSMISSION_FAMILIES: List[TransmissionFamily] = [
    TransmissionFamily(
        manufacturer="Tremec",
        model="TKX",
        variants=[
            TransmissionVariant(
                name="GM Close Ratio",
                gear_ratios=[2.87, 1.89, 1.28, 1.0, 0.81],
                application_manufacturers=["GM"],
            ),
            TransmissionVariant(
                name="Ford Close Ratio",
                gear_ratios=[2.87, 1.89, 1.28, 1.0, 0.81],
                application_manufacturers=["Ford"],
            ),
            TransmissionVariant(
                name="GM Wide Ratio",
                gear_ratios=[2.87, 1.89, 1.28, 1.0, 0.81],
                application_manufacturers=["GM"],
            ),
            TransmissionVariant(
                name="Ford Wide Ratio",
                gear_ratios=[2.87, 1.89, 1.28, 1.0, 0.81],
                application_manufacturers=["Ford"],
            ),
        ],
    ),
    TransmissionFamily(
        manufacturer="Aisin",
        model="L43",
        variants=[
            TransmissionVariant(
                name="Toyota",
                gear_ratios=[3.67, 2.11, 1.451, 1.0],
                application_manufacturers=["Toyota"],
                reverse_ratio=4.18,
            )
        ],
    ),
    TransmissionFamily(
        manufacturer="Aisin",
        model="L45",
        variants=[
            TransmissionVariant(
                name="Toyota",
                gear_ratios=[3.928, 2.333, 1.451, 1.0],
                application_manufacturers=["Toyota"],
                reverse_ratio=4.743,
            )
        ],
    ),
    TransmissionFamily(
        manufacturer="Aisin",
        model="L50",
        variants=[
            TransmissionVariant(
                name="Toyota",
                gear_ratios=[3.928, 2.333, 1.451, 1.0, 0.851],
                application_manufacturers=["Toyota"],
                reverse_ratio=4.743,
            )
        ],
    ),
    TransmissionFamily(
        manufacturer="Aisin",
        model="W56",
        variants=[
            TransmissionVariant(
                name="Toyota",
                gear_ratios=[3.954, 2.141, 1.384, 1.0, 0.85],
                application_manufacturers=["Toyota"],
                reverse_ratio=4.091,
            )
        ],
    ),
    TransmissionFamily(
        manufacturer="GM",
        model="Muncie M20",
        variants=[
            TransmissionVariant(
                name="63-65 Wide Ratio",
                gear_ratios=[2.56, 1.91, 1.48, 1.0],
                application_manufacturers=["GM"],
            ),
            TransmissionVariant(
                name="66-70 Wide Ratio",
                gear_ratios=[2.52, 1.88, 1.46, 1.0],
                application_manufacturers=["GM"],
            ),
            TransmissionVariant(
                name="71-74 Wide Ratio",
                gear_ratios=[2.52, 1.88, 1.46, 1.0],
                application_manufacturers=["GM"],
            ),
        ],
    ),
]


def _serialize_family(family: TransmissionFamily) -> Dict[str, Any]:
    return {
        "manufacturer": family.manufacturer,
        "model": family.model,
        "variants": [
            {
                "name": variant.name,
                "gear_ratios": variant.gear_ratios,
                "application_manufacturers": variant.application_manufacturers,
                "reverse_ratio": variant.reverse_ratio,
            }
            for variant in family.variants
        ],
    }


app = FastAPI(title="Transmission Ratio Viz API", version="0.1.0")

REPO_ROOT = Path(__file__).resolve().parents[1]

raw_frontend_dist = os.getenv("FRONTEND_DIST", "")
candidate_dist = Path(raw_frontend_dist).expanduser() if raw_frontend_dist else REPO_ROOT / "frontend" / "dist"
if not candidate_dist.exists():
    candidate_dist = REPO_ROOT / "bazel-bin" / "frontend" / "dist"
if not candidate_dist.exists():
    candidate_dist = REPO_ROOT / "frontend" / "dist"

FRONTEND_DIST = candidate_dist

if FRONTEND_DIST.exists():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")


@app.get("/")
def frontend_root() -> FileResponse:
    index_path = FRONTEND_DIST / "index.html"
    if not index_path.exists():
        raise FileNotFoundError(f"Frontend bundle not found at {index_path}")
    return FileResponse(index_path)


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/api/transmissions")
def transmission_catalog() -> List[Dict[str, Any]]:
    return [_serialize_family(family) for family in TRANSMISSION_FAMILIES]


@app.post("/api/gearing/speeds")
def calculate_speeds(payload: dict) -> List[dict]:
    results = gear_speeds(
        engine_rpm=payload["engine_rpm"],
        tire_diameter_in=payload["tire_diameter_in"],
        gear_ratios=payload["gear_ratios"],
        axle_ratio=payload["axle_ratio"],
        transfer_case_ratios=tuple(payload.get("transfer_case_ratios", [])),
    )
    return [result.__dict__ for result in results]


if __name__ == "__main__":
    uvicorn.run(
        app,
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", "8000")),
    )
