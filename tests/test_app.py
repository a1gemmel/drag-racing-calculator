import importlib

from fastapi.testclient import TestClient


def test_root_serves_frontend_index(monkeypatch, tmp_path) -> None:
    index_file = tmp_path / "index.html"
    index_file.write_text("<html><body><h1>frontend</h1></body></html>")
    monkeypatch.setenv("FRONTEND_DIST", str(tmp_path))

    import backend.app as app_module

    importlib.reload(app_module)
    response = app_module.frontend_root()

    assert response.status_code == 200
    assert "frontend" in str(response.path)


def test_health_endpoint_still_works(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("FRONTEND_DIST", str(tmp_path))

    import backend.app as app_module

    importlib.reload(app_module)
    response = app_module.health()

    assert response == {"status": "ok"}


def test_transmission_catalog_endpoint_lists_families_and_variants(
    monkeypatch, tmp_path
) -> None:
    monkeypatch.setenv("FRONTEND_DIST", str(tmp_path))

    import backend.app as app_module

    importlib.reload(app_module)
    client = TestClient(app_module.app)
    response = client.get("/api/transmissions")

    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)

    tremec_tkx = next(
        item for item in payload if item["manufacturer"] == "Tremec" and item["model"] == "TKX"
    )
    assert tremec_tkx["variants"][0]["name"] == "GM Close Ratio"
    assert tremec_tkx["variants"][0]["gear_ratios"] == [2.87, 1.89, 1.28, 1.0, 0.81]
    assert tremec_tkx["variants"][0]["application_manufacturers"] == ["GM"]

    aisin_l50 = next(
        item for item in payload if item["manufacturer"] == "Aisin" and item["model"] == "L50"
    )
    assert any(
        variant["name"] == "Toyota" and variant["gear_ratios"] == [3.928, 2.333, 1.451, 1.0, 0.851]
        for variant in aisin_l50["variants"]
    )
