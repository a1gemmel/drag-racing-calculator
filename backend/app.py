from fastapi import FastAPI
import os
from typing import Dict, List

import uvicorn

from backend.calculations import gear_speeds

app = FastAPI(title="Transmission Ratio Viz API", version="0.1.0")


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


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