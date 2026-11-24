import { useEffect, useMemo, useState } from "react";
import { transmissionFamilies, type TransmissionFamily, type TransmissionVariant } from "./catalog";
import { rpmForSpeed, speedMph } from "./calculations";

type Point = { x: number; y: number };
type HoverState = { gearLabel: string; point: Point; rpm: number; speed: number } | null;

type Gear = { label: string; ratio: number };

const defaultConfig = {
  tireDiameter: 26,
  axleRatio: 4.1,
  minRpm: 1500,
  maxRpm: 6500,
};

// SVG viewBox is 640x320; the plot area sits inside these edges.
const PLOT = { left: 60, right: 600, top: 30, bottom: 280 };
const HOVER_BOX_WIDTH = 160;

// Largest "nice" step (1, 2, 2.5, 5 x 10^n) that splits `max` into at most `maxTicks` intervals.
function niceStep(max: number, maxTicks: number) {
  const rough = max / maxTicks;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const multiplier = [1, 2, 2.5, 5, 10].find((m) => m * magnitude >= rough) ?? 10;
  return multiplier * magnitude;
}

function gearLabel(index: number) {
  const labels = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"];
  return labels[index] ?? `${index + 1}`;
}

export function App() {
  const [draft, setDraft] = useState(defaultConfig);
  const [config, setConfig] = useState(defaultConfig);
  const [hover, setHover] = useState<HoverState>(null);
  const families = transmissionFamilies;
  const [primarySelection, setPrimarySelection] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedVariantName, setSelectedVariantName] = useState("");
  const [gearsetView, setGearsetView] = useState<"overview" | "cruising">("overview");
  const [rpmMode, setRpmMode] = useState<"range" | "shift">("range");
  const [shiftRpm, setShiftRpm] = useState(6500);
  const shiftPointEnabled = rpmMode === "shift";

  const manufacturerOptions = useMemo(
    () => Array.from(new Set(families.map((family) => family.manufacturer))).sort(),
    [families],
  );

  const brandOptions = useMemo(
    () =>
      Array.from(
        new Set(
          families.flatMap((family) =>
            family.variants.flatMap((variant) => variant.application_manufacturers),
          ),
        ),
      ).sort(),
    [families],
  );

  const scopeOptions = useMemo(
    () => [
      { value: "all", label: "All" },
      ...manufacturerOptions.map((manufacturer) => ({
        value: `manufacturer:${manufacturer}`,
        label: `Manufacturer: ${manufacturer}`,
      })),
      ...brandOptions.map((brand) => ({ value: `brand:${brand}`, label: `Brand: ${brand}` })),
    ],
    [brandOptions, manufacturerOptions],
  );

  const hasPrimarySelection = primarySelection !== "";
  const primaryMode = !hasPrimarySelection
    ? null
    : primarySelection === "all"
      ? "all"
      : primarySelection.startsWith("manufacturer:")
        ? "manufacturer"
        : "brand";

  const selectedManufacturer = primaryMode === "manufacturer" ? primarySelection.replace("manufacturer:", "") : "";
  const selectedBrand = primaryMode === "brand" ? primarySelection.replace("brand:", "") : "";

  const modelOptions = useMemo(() => {
    if (primaryMode === "manufacturer") {
      return families
        .filter((family) => family.manufacturer === selectedManufacturer)
        .map((family) => ({ value: family.model, label: family.model }));
    }

    if (primaryMode === "all") {
      return families.map((family) => ({ value: family.model, label: family.model }));
    }

    return [];
  }, [families, primaryMode, selectedManufacturer]);

  const formatVariantLabel = (familyModel: string, variant: TransmissionVariant) => {
    const ratios = variant.gear_ratios.join(" / ");
    return `${familyModel} / ${variant.name} (${ratios})`;
  };

  const brandVariantOptions = useMemo(() => {
    if (!selectedBrand) {
      return [];
    }

    return families
      .flatMap((family) =>
        family.variants
          .filter((variant) => variant.application_manufacturers.includes(selectedBrand))
          .map((variant) => ({
            value: `${family.model}::${variant.name}`,
            label: formatVariantLabel(family.model, variant),
          })),
      )
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [families, selectedBrand]);

  useEffect(() => {
    if (!families.length) return;

    if (!hasPrimarySelection) {
      setSelectedModel("");
      setSelectedVariantName("");
      return;
    }

    if (primaryMode === "all") {
      const firstFamily = families[0];
      if (!firstFamily) {
        setSelectedModel("");
        setSelectedVariantName("");
        return;
      }

      setSelectedModel((current) => {
        if (!current || !families.some((family) => family.model === current)) {
          return firstFamily.model;
        }
        return current;
      });
      setSelectedVariantName((current) => {
        if (!current || !firstFamily.variants.some((variant) => variant.name === current)) {
          return firstFamily.variants[0]?.name ?? "";
        }
        return current;
      });
      return;
    }

    if (primaryMode === "manufacturer") {
      const family = families.find((item) => item.manufacturer === selectedManufacturer);
      if (!family) {
        setSelectedModel("");
        setSelectedVariantName("");
        return;
      }

      setSelectedModel(family.model);
      setSelectedVariantName(family.variants[0]?.name ?? "");
      return;
    }

    const firstMatch = families
      .flatMap((family) => family.variants.map((variant) => ({ family, variant })))
      .find(({ variant }) => variant.application_manufacturers.includes(selectedBrand));

    if (!firstMatch) {
      setSelectedModel("");
      setSelectedVariantName("");
      return;
    }

    setSelectedModel(firstMatch.family.model);
    setSelectedVariantName(firstMatch.variant.name);
  }, [families, hasPrimarySelection, primaryMode, selectedBrand, selectedManufacturer]);

  const activeFamily = useMemo(
    () => families.find((family) => family.model === selectedModel) ?? families[0] ?? null,
    [families, selectedModel],
  );

  const activeVariants = activeFamily?.variants ?? [];
  const activeVariant = useMemo(
    () => activeVariants.find((variant) => variant.name === selectedVariantName) ?? activeVariants[0] ?? null,
    [activeVariants, selectedVariantName],
  );

  useEffect(() => {
    if (!activeFamily) return;
    if (!selectedVariantName || !activeFamily.variants.some((variant) => variant.name === selectedVariantName)) {
      setSelectedVariantName(activeFamily.variants[0]?.name ?? "");
    }
  }, [activeFamily, selectedVariantName]);

  const gearSet = useMemo<Gear[]>(() => {
    if (!activeVariant) return [];
    return activeVariant.gear_ratios.map((ratio, index) => ({
      label: gearLabel(index),
      ratio,
    }));
  }, [activeVariant]);

  const minRpm = Math.min(config.minRpm, config.maxRpm);
  const maxRpm = Math.max(config.minRpm, config.maxRpm);
  const safeShiftRpm = Math.min(Math.max(shiftRpm, minRpm), maxRpm);
  const maxSpeedRaw = Math.max(
    ...gearSet.map((gear) => speedMph(maxRpm, config.tireDiameter, gear.ratio, config.axleRatio)),
    1,
  );
  const speedStep = niceStep(maxSpeedRaw, 8);
  const maxSpeed = Math.ceil(maxSpeedRaw / speedStep) * speedStep;
  const speedTicks = Array.from({ length: Math.round(maxSpeed / speedStep) + 1 }, (_, i) => i * speedStep);
  const rpmFloor = 0;
  const rpmCeiling = Math.max(Math.ceil(maxRpm / 1000) * 1000, 1000);
  const rpmStep = niceStep(rpmCeiling, 8);
  const rpmTicks = Array.from({ length: Math.floor(rpmCeiling / rpmStep) + 1 }, (_, i) => i * rpmStep);

  const chartLines = useMemo(
    () =>
      gearSet.map((gear, index) => {
        if (!shiftPointEnabled) {
          const start = speedMph(minRpm, config.tireDiameter, gear.ratio, config.axleRatio);
          const end = speedMph(maxRpm, config.tireDiameter, gear.ratio, config.axleRatio);

          return {
            ...gear,
            start: { x: start, y: minRpm },
            end: { x: end, y: maxRpm },
          };
        }

        const startSpeed = index === 0 ? 0 : speedMph(safeShiftRpm, config.tireDiameter, gearSet[index - 1].ratio, config.axleRatio);
        const startRpm = index === 0 ? 0 : rpmForSpeed(startSpeed, config.tireDiameter, gear.ratio, config.axleRatio);
        const endSpeed = speedMph(safeShiftRpm, config.tireDiameter, gear.ratio, config.axleRatio);

        return {
          ...gear,
          start: { x: startSpeed, y: startRpm },
          end: { x: endSpeed, y: safeShiftRpm },
        };
      }),
    [config, gearSet, maxRpm, minRpm, safeShiftRpm, shiftPointEnabled],
  );

  const shiftConnectors = useMemo(() => {
    if (!shiftPointEnabled || gearSet.length < 2) {
      return [];
    }

    return gearSet.slice(1).map((gear, index) => {
      const previousGear = gearSet[index];
      const shiftSpeed = speedMph(safeShiftRpm, config.tireDiameter, previousGear.ratio, config.axleRatio);
      const nextGearRpmAtShiftSpeed = rpmForSpeed(shiftSpeed, config.tireDiameter, gear.ratio, config.axleRatio);

      return {
        previousGear,
        gear,
        start: {
          x: shiftSpeed,
          y: safeShiftRpm,
        },
        end: {
          x: shiftSpeed,
          y: nextGearRpmAtShiftSpeed,
        },
      };
    });
  }, [config.axleRatio, config.tireDiameter, gearSet, safeShiftRpm, shiftPointEnabled]);

  const cruisingRows = useMemo(() => {
    const speeds = Array.from({ length: 8 }, (_, index) => (index + 1) * 10);

    return speeds.map((speed) => ({
      speed,
      rpmByGear: gearSet.reduce<Record<string, number>>((accumulator, gear) => {
        accumulator[gear.label] = rpmForSpeed(speed, config.tireDiameter, gear.ratio, config.axleRatio);
        return accumulator;
      }, {}),
    }));
  }, [config.axleRatio, config.tireDiameter, gearSet]);

  const formatCruisingRpm = (rpm: number) => {
    if (rpm < minRpm || rpm > maxRpm) {
      return "—";
    }

    return `${Math.round(rpm).toLocaleString()} rpm`;
  };

  const xScale = (speed: number) => PLOT.left + (speed / maxSpeed) * (PLOT.right - PLOT.left);
  const yScale = (rpm: number) =>
    PLOT.bottom - ((rpm - rpmFloor) / Math.max(rpmCeiling - rpmFloor, 1)) * (PLOT.bottom - PLOT.top);

  const getPointForMouse = (gear: { label: string; ratio: number; start: Point; end: Point }, relativeX: number) => {
    const x1 = xScale(gear.start.x);
    const x2 = xScale(gear.end.x);
    const y1 = yScale(gear.start.y);
    const y2 = yScale(gear.end.y);
    const dx = x2 - x1;
    const dy = y2 - y1;

    const t = dx === 0 ? 0 : (relativeX - x1) / dx;
    const clampedT = Math.min(1, Math.max(0, t));
    const speed = gear.start.x + (gear.end.x - gear.start.x) * clampedT;
    const rpm = gear.start.y + (gear.end.y - gear.start.y) * clampedT;
    const point = { x: speed, y: rpm };

    return {
      gearLabel: gear.label,
      point,
      speed,
      rpm,
      x: x1 + dx * clampedT,
      y: y1 + dy * clampedT,
    };
  };

  // Commit only valid values; an empty or non-positive field keeps the last good value
  // (zero tire diameter or axle ratio would make the speed math throw).
  const finalizeDraft = () => {
    const next = {
      tireDiameter: draft.tireDiameter > 0 ? draft.tireDiameter : config.tireDiameter,
      axleRatio: draft.axleRatio > 0 ? draft.axleRatio : config.axleRatio,
      minRpm: draft.minRpm >= 0 ? draft.minRpm : config.minRpm,
      maxRpm: draft.maxRpm > 0 ? draft.maxRpm : config.maxRpm,
    };
    setDraft(next);
    setConfig(next);
  };

  const handlePrimarySelectionChange = (nextValue: string) => {
    setPrimarySelection(nextValue);

    if (nextValue === "all") {
      const firstFamily = families[0];
      if (firstFamily) {
        setSelectedModel(firstFamily.model);
        setSelectedVariantName(firstFamily.variants[0]?.name ?? "");
      }
      return;
    }

    if (nextValue.startsWith("manufacturer:")) {
      const manufacturer = nextValue.replace("manufacturer:", "");
      const family = families.find((item) => item.manufacturer === manufacturer) ?? families[0];
      if (family) {
        setSelectedModel(family.model);
        setSelectedVariantName(family.variants[0]?.name ?? "");
      }
      return;
    }

    if (nextValue.startsWith("brand:")) {
      const brand = nextValue.replace("brand:", "");
      const matching = families
        .flatMap((family) => family.variants.map((variant) => ({ family, variant })))
        .find(({ variant }) => variant.application_manufacturers.includes(brand));

      if (matching) {
        setSelectedModel(matching.family.model);
        setSelectedVariantName(matching.variant.name);
      }
    }
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">DRIVETRAIN LAB / 01</p>
          <h1>Transmission Ratio Viz</h1>
        </div>
        <button className="save-button">Save build</button>
      </header>

      <section className="workspace-heading">
        <div>
          <p className="eyebrow">GEARING WORKSPACE</p>
          <h2>See the shape of every shift.</h2>
        </div>
        <p className="intro">
          Model the relationship between engine speed, gearing, and road speed
          before the first test drive.
        </p>
      </section>

      <section className="workspace-grid">
        <aside className="panel controls-panel">
          <div className="panel-title">
            <span>01</span>
            <h3>Configuration</h3>
          </div>

          <label>
            Transmission search
            <select value={primarySelection} onChange={(event) => handlePrimarySelectionChange(event.target.value)}>
              {scopeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {hasPrimarySelection && primaryMode !== "brand" ? (
            <label>
              Transmission model
              <select
                value={selectedModel}
                onChange={(event) => {
                  const nextModel = event.target.value;
                  const nextFamily = families.find((family) => family.model === nextModel);
                  setSelectedModel(nextModel);
                  setSelectedVariantName(nextFamily?.variants[0]?.name ?? "");
                }}
                disabled={modelOptions.length === 0}
              >
                {modelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {hasPrimarySelection && primaryMode === "brand" && brandVariantOptions.length > 1 ? (
            <label>
              Transmission variant
              <select
                value={
                  brandVariantOptions.find((option) => option.value === `${selectedModel}::${selectedVariantName}`)?.value ??
                  brandVariantOptions[0]?.value ??
                  ""
                }
                onChange={(event) => {
                  const value = event.target.value;
                  const [nextModel, nextVariant] = value.split("::");
                  if (nextModel && nextVariant) {
                    setSelectedModel(nextModel);
                    setSelectedVariantName(nextVariant);
                  }
                }}
                disabled={brandVariantOptions.length === 0}
              >
                {brandVariantOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {hasPrimarySelection && primaryMode !== "brand" && activeFamily && activeVariants.length > 1 ? (
            <label>
              Variant
              <select
                value={selectedVariantName}
                onChange={(event) => setSelectedVariantName(event.target.value)}
                disabled={activeVariants.length === 0}
              >
                {activeVariants.map((variant) => (
                  <option key={variant.name} value={variant.name}>
                    {variant.name} ({variant.gear_ratios.join(" / ")})
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="field-row">
            <label>
              Tire diameter
              <input
                value={draft.tireDiameter}
                type="number"
                onChange={(event) => {
                  const value = Number.parseFloat(event.target.value);
                  setDraft((current) => ({ ...current, tireDiameter: Number.isFinite(value) ? value : 0 }));
                }}
                onBlur={finalizeDraft}
              />
            </label>
            <label>
              Rear axle
              <input
                value={draft.axleRatio}
                type="number"
                step="0.01"
                onChange={(event) => {
                  const value = Number.parseFloat(event.target.value);
                  setDraft((current) => ({ ...current, axleRatio: Number.isFinite(value) ? value : 0 }));
                }}
                onBlur={finalizeDraft}
              />
            </label>
          </div>

          <div className="rpm-mode-panel">
            <div className="rpm-mode-header">
              <span className="label-small">INPUT MODE</span>
            </div>
            <div className="mode-toggle" role="tablist" aria-label="RPM input mode selector">
              <button
                type="button"
                className={rpmMode === "range" ? "mode-toggle-btn active" : "mode-toggle-btn"}
                onClick={() => setRpmMode("range")}
              >
                RPM Range
              </button>
              <button
                type="button"
                className={rpmMode === "shift" ? "mode-toggle-btn active" : "mode-toggle-btn"}
                onClick={() => setRpmMode("shift")}
              >
                Shift Point
              </button>
            </div>
          </div>

          {rpmMode === "range" ? (
            <fieldset className="rpm-range">
              <legend>RPM range</legend>
              <div className="field-row">
                <label>
                  Min RPM
                  <input
                    value={draft.minRpm}
                    type="number"
                    onChange={(event) => {
                      const value = Number.parseInt(event.target.value, 10);
                      setDraft((current) => ({ ...current, minRpm: Number.isFinite(value) ? value : 0 }));
                    }}
                    onBlur={finalizeDraft}
                  />
                </label>
                <label>
                  Max RPM
                  <input
                    value={draft.maxRpm}
                    type="number"
                    onChange={(event) => {
                      const value = Number.parseInt(event.target.value, 10);
                      setDraft((current) => ({ ...current, maxRpm: Number.isFinite(value) ? value : 0 }));
                    }}
                    onBlur={finalizeDraft}
                  />
                </label>
              </div>
            </fieldset>
          ) : (
            <div className="shift-point-panel">
              <label>
                Shift RPM
                <input
                  type="number"
                  value={shiftRpm}
                  min={minRpm}
                  max={maxRpm}
                  onChange={(event) => {
                    const value = Number.parseInt(event.target.value, 10);
                    setShiftRpm(Number.isFinite(value) ? value : minRpm);
                  }}
                />
              </label>
            </div>
          )}

          <div className="transfer-case">
            <div>
              <span className="label-small">AUXILIARY STAGE</span>
              <strong>{activeFamily ? `${activeFamily.manufacturer} ${activeFamily.model}` : "No transmission selected"}</strong>
            </div>
            <button className="text-button">+ Add stage</button>
          </div>
        </aside>

        <section className="panel chart-panel">
          <div className="panel-title chart-title">
            <div>
              <span>02</span>
              <h3>Road speed vs RPM</h3>
            </div>
            <span className="unit-chip">MPH / RPM</span>
          </div>

          <div className="chart-frame">
              <svg className="chart-svg" viewBox="0 0 640 320" aria-label="Road speed vs RPM by gear">
                {rpmTicks.map((rpm) => {
                  const y = yScale(rpm);
                  return (
                    <g key={`grid-y-${rpm}`}>
                      <line className="grid-line" x1={PLOT.left} x2={PLOT.right} y1={y} y2={y} />
                      <text className="axis-label" x={PLOT.left - 8} y={y + 4} textAnchor="end">
                        {rpm.toLocaleString()}
                      </text>
                    </g>
                  );
                })}

                {speedTicks.map((speed) => {
                  const x = xScale(speed);
                  return (
                    <g key={`grid-x-${speed}`}>
                      <line className="grid-line" x1={x} x2={x} y1={PLOT.top} y2={PLOT.bottom} />
                      <text className="axis-label" x={x} y={PLOT.bottom + 20} textAnchor="middle">
                        {speed}
                      </text>
                    </g>
                  );
                })}

                <line className="axis" x1={PLOT.left} x2={PLOT.left} y1={PLOT.top} y2={PLOT.bottom} />
                <line className="axis" x1={PLOT.left} x2={PLOT.right} y1={PLOT.bottom} y2={PLOT.bottom} />

                {shiftPointEnabled &&
                  shiftConnectors.map((connector) => {
                    const startX = xScale(connector.start.x);
                    const startY = yScale(connector.start.y);
                    const endX = xScale(connector.end.x);
                    const endY = yScale(connector.end.y);

                    return (
                      <path
                        key={`${connector.previousGear.label}-${connector.gear.label}-shift`}
                        className="shift-connector"
                        d={`M ${startX} ${startY} L ${endX} ${endY}`}
                      />
                    );
                  })}

                {chartLines.map((gear, index) => {
                  const lineStartX = xScale(gear.start.x);
                  const lineStartY = yScale(gear.start.y);
                  const lineEndX = xScale(gear.end.x);
                  const lineEndY = yScale(gear.end.y);
                  const isActive = hover?.gearLabel === gear.label;
                  const shiftLabelX = lineStartX > 420 ? lineStartX - 12 : lineStartX + 12;
                  const shiftLabelY = lineStartY < 70 ? lineStartY + 16 : lineStartY - 12;
                  const gearLabelX = lineEndX > 500 ? lineEndX - 10 : lineEndX + 10;
                  const gearLabelY = lineEndY < 60 ? lineEndY + 16 : lineEndY - 8;
                  const gearTextAnchor = lineEndX > 500 ? "end" : "start";
                  const shiftTextAnchor = lineStartX > 420 ? "end" : "start";
                    const lowerShiftRpm = index === 0 ? 0 : Math.round(rpmForSpeed(gear.start.x, config.tireDiameter, gear.ratio, config.axleRatio));

                  return (
                    <g key={gear.label}>
                      <path
                        className="hover-hit-area"
                        d={`M ${lineStartX} ${lineStartY} L ${lineEndX} ${lineEndY}`}
                        strokeWidth={22}
                        stroke="transparent"
                        fill="none"
                        onMouseMove={(event) => {
                          const svg = event.currentTarget.ownerSVGElement;
                          const rect = svg?.getBoundingClientRect();
                          if (!rect) return;

                          const relativeX = ((event.clientX - rect.left) / rect.width) * 640;
                          const marker = getPointForMouse(gear, relativeX);
                          setHover({
                            gearLabel: gear.label,
                            point: marker.point,
                            rpm: marker.rpm,
                            speed: marker.speed,
                          });
                        }}
                        onMouseLeave={() => setHover(null)}
                      />
                      <path
                        className={isActive ? "gear-line active" : "gear-line"}
                        d={`M ${lineStartX} ${lineStartY} L ${lineEndX} ${lineEndY}`}
                        onMouseMove={(event) => {
                          const svg = event.currentTarget.ownerSVGElement;
                          const rect = svg?.getBoundingClientRect();
                          if (!rect) return;

                          const relativeX = ((event.clientX - rect.left) / rect.width) * 640;
                          const marker = getPointForMouse(gear, relativeX);
                          setHover({
                            gearLabel: gear.label,
                            point: marker.point,
                            rpm: marker.rpm,
                            speed: marker.speed,
                          });
                        }}
                        onMouseLeave={() => setHover(null)}
                      />
                      {isActive && hover && (() => {
                        const dotX = xScale(hover.point.x);
                        const dotY = yScale(hover.point.y);
                        // Keep the tooltip inside the plot: flip left near the right edge, push down near the top.
                        const boxX = dotX + 10 + HOVER_BOX_WIDTH > PLOT.right ? dotX - 10 - HOVER_BOX_WIDTH : dotX + 10;
                        const boxY = Math.max(dotY - 28, 4);
                        return (
                          <g>
                            <circle className="hover-dot" cx={dotX} cy={dotY} r={5} />
                            <rect className="hover-box" x={boxX} y={boxY} width={HOVER_BOX_WIDTH} height="42" rx="8" />
                            <text className="hover-text" x={boxX + 12} y={boxY + 22}>
                              {gear.label}
                            </text>
                            <text className="hover-text" x={boxX + 12} y={boxY + 38}>
                              {Math.round(hover.rpm).toLocaleString()} RPM / {hover.speed.toFixed(1)} MPH
                            </text>
                          </g>
                        );
                      })()}
                      {shiftPointEnabled && gear.label !== "1st" && (
                        <g>
                          <circle
                            className="shift-point-marker"
                            cx={lineStartX}
                            cy={lineStartY}
                            r={4}
                          />
                          <text
                            className="shift-label"
                            x={shiftLabelX}
                            y={shiftLabelY}
                            textAnchor={shiftTextAnchor}
                          >
                            {`${lowerShiftRpm.toLocaleString()} RPM / ${gear.start.x.toFixed(1)} MPH`}
                          </text>
                        </g>
                      )}
                      <text className="gear-label" x={gearLabelX} y={gearLabelY} textAnchor={gearTextAnchor}>
                        {gear.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
          </div>
        </section>
      </section>

      <section className="panel ratio-panel">
        <div className="panel-title">
          <div>
            <span>03</span>
            <h3>Gearset overview</h3>
          </div>
          <div className="gearset-tabs" role="tablist" aria-label="Gearset overview tabs">
            <button
              type="button"
              role="tab"
              aria-selected={gearsetView === "overview"}
              className={gearsetView === "overview" ? "gearset-tab active" : "gearset-tab"}
              onClick={() => setGearsetView("overview")}
            >
              Overview
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={gearsetView === "cruising"}
              className={gearsetView === "cruising" ? "gearset-tab active" : "gearset-tab"}
              onClick={() => setGearsetView("cruising")}
            >
              Cruising RPM
            </button>
          </div>
        </div>

        {gearsetView === "overview" ? (
          <div className="ratio-table">
            {gearSet.map((gear, index) => (
              <div className="ratio-row" key={gear.label}>
                <span>{gear.label}</span>
                <strong>{gear.ratio.toFixed(2)}</strong>
                <span>
                  {index === 0 ? "Starting gear" : `${Math.round((1 - gear.ratio / gearSet[index - 1].ratio) * 100)}% drop`}
                </span>
                <span>{speedMph(maxRpm, config.tireDiameter, gear.ratio, config.axleRatio).toFixed(1)} mph</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="ratio-table cruising-table">
            <div className="ratio-row cruising-header">
              <span>Gear</span>
              {cruisingRows.map((row) => (
                <strong key={`speed-${row.speed}`}>{row.speed} mph</strong>
              ))}
            </div>
            {gearSet.map((gear) => (
              <div className="ratio-row cruising-row" key={gear.label}>
                <span>{gear.label}</span>
                {cruisingRows.map((row) => (
                  <span key={`${gear.label}-${row.speed}`}>
                    {formatCruisingRpm(row.rpmByGear[gear.label] ?? 0)}
                  </span>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
