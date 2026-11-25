import { useMemo, useState } from "react";
import { rpmForSpeed, speedMph } from "./calculations";
import { transmissionFamilies } from "./catalog";
import { GearChart, type Gear } from "./components/GearChart";
import { NumberField } from "./components/NumberField";
import { Segmented } from "./components/Segmented";
import { PowerCard } from "./components/PowerCard";
import { QuarterMileCard } from "./components/QuarterMileCard";
import { TireField, type TireMode } from "./components/TireField";
import { readEmbeddedSettings, type AppSettings } from "./appState";
import { downloadOfflineCopy, OFFLINE_FILE_NAME, offlineCopyAvailable, offlineCopyKb } from "./offline";
import { buildCurve, DEFAULT_POWER, type PowerState } from "./power";
import { DEFAULT_VEHICLE, type VehicleSetup } from "./quarterMile";
import { parseTireSize } from "./tires";
import { ALL_SCOPE, filterFamilies, resolveSelection, scopeOptions } from "./transmissionSearch";

type RpmMode = "shift" | "range";

// Gear colors in fixed order (validated for CVD separation on the dark chart surface).
// Color follows the gear, so 1st is always the same blue whatever transmission is shown.
const GEAR_COLORS = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#0ca30c", "#9085e9", "#e66767"];
const ORDINALS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"];
const CRUISE_SPEEDS = [10, 20, 30, 40, 50, 60, 70, 80];
const HIGHWAY_MPH = 65;
const LUGGING_RPM = 800;
const CRUISE_FLOOR_RPM = 1200;

export function App() {
  const families = transmissionFamilies;
  // Defaults, or the settings embedded in this page by a previous "Download offline copy".
  const [initial] = useState(() => readEmbeddedSettings(document));
  const [query, setQuery] = useState(initial.query);
  const [scope, setScope] = useState(initial.scope);
  // The user's last pick. If a search or filter hides it, resolveSelection falls back to the first match.
  const [selectedModel, setSelectedModel] = useState(initial.selectedModel);
  const [selectedVariantName, setSelectedVariantName] = useState(initial.selectedVariantName);
  const [tireMode, setTireMode] = useState<TireMode>(initial.tireMode);
  const [tireDiameterIn, setTireDiameterIn] = useState(initial.tireDiameterIn);
  const [tireSize, setTireSize] = useState(initial.tireSize);
  const parsedTire = tireMode === "size" ? parseTireSize(tireSize) : null;
  // Speed math uses the rolling diameter: as entered in diameter mode, size math minus the rolling correction otherwise.
  const tireDiameter = parsedTire ? parsedTire.effectiveDiameterIn : tireDiameterIn;
  const tireLabel = parsedTire ? `${parsedTire.label} (${tireDiameter.toFixed(1)}″)` : `${tireDiameter}″ tire`;
  const [axleRatio, setAxleRatio] = useState(initial.axleRatio);
  const [rpmMode, setRpmMode] = useState<RpmMode>(initial.rpmMode);
  const [shiftRpm, setShiftRpm] = useState(initial.shiftRpm);
  const [minRpm, setMinRpm] = useState(initial.minRpm);
  const [maxRpm, setMaxRpm] = useState(initial.maxRpm);
  const [gearsetView, setGearsetView] = useState<"ladder" | "cruising">(initial.gearsetView);
  const [power, setPower] = useState<PowerState>(initial.power);
  const [vehicle, setVehicle] = useState<VehicleSetup>(initial.vehicle);
  const powerCurve = useMemo(() => buildCurve(power), [power]);
  // Trap-speed weight drives the sim's race weight (one way: editing race weight leaves the trap pass alone).
  const changePower = (next: PowerState) => {
    if (next.trapWeightLb !== power.trapWeightLb) setVehicle((current) => ({ ...current, weightLb: next.trapWeightLb }));
    setPower(next);
  };

  const scopes = useMemo(() => scopeOptions(families), [families]);
  const filteredFamilies = useMemo(() => filterFamilies(families, scope, query), [families, scope, query]);
  const selection = resolveSelection(filteredFamilies, selectedModel, selectedVariantName);

  const currentSettings = (): AppSettings => ({
    query,
    scope,
    // Save what's actually shown, which may be a fallback if the search hid the last pick.
    selectedModel: selection?.family.model ?? selectedModel,
    selectedVariantName: selection?.variant.name ?? selectedVariantName,
    tireMode,
    tireDiameterIn,
    tireSize,
    axleRatio,
    rpmMode,
    shiftRpm,
    minRpm,
    maxRpm,
    gearsetView,
    power,
    vehicle,
  });

  const gears = useMemo<Gear[]>(
    () =>
      (selection?.variant.gear_ratios ?? []).map((ratio, index) => ({
        label: ORDINALS[index] ?? `${index + 1}`,
        ratio,
        color: GEAR_COLORS[index % GEAR_COLORS.length],
      })),
    [selection?.variant],
  );

  const low = Math.min(minRpm, maxRpm);
  const high = Math.max(minRpm, maxRpm);
  const topRpm = rpmMode === "shift" ? shiftRpm : high;
  const speedAt = (rpm: number, ratio: number) => speedMph(rpm, tireDiameter, ratio, axleRatio);
  const rpmAt = (mph: number, ratio: number) => rpmForSpeed(mph, tireDiameter, ratio, axleRatio);

  // RPM after each upshift made at topRpm, and the size of the drop.
  const shifts = gears.slice(1).map((gear, index) => {
    const from = gears[index];
    const landing = rpmAt(speedAt(topRpm, from.ratio), gear.ratio);
    return { from, to: gear, landing, drop: topRpm - landing, step: 1 - gear.ratio / from.ratio };
  });
  const biggestShift = shifts.reduce<(typeof shifts)[number] | null>(
    (best, shift) => (best === null || shift.drop > best.drop ? shift : best),
    null,
  );
  const topGear = gears[gears.length - 1];

  // Best cruising gear per speed: the lowest RPM that is still >= CRUISE_FLOOR_RPM and <= topRpm.
  const bestCruiseGear = new Map<number, string>();
  for (const mph of CRUISE_SPEEDS) {
    let best: { label: string; rpm: number } | null = null;
    for (const gear of gears) {
      const rpm = rpmAt(mph, gear.ratio);
      if (rpm >= CRUISE_FLOOR_RPM && rpm <= topRpm && (best === null || rpm < best.rpm)) best = { label: gear.label, rpm };
    }
    if (best) bestCruiseGear.set(mph, best.label);
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
            <path d="M4 26 L12 14 L18 18 L28 5" />
            <circle cx="12" cy="14" r="2.5" />
            <circle cx="18" cy="18" r="2.5" />
          </svg>
          <h1>Drag Racing Calculator</h1>
        </div>
        <button
          type="button"
          className="download-button"
          onClick={() => downloadOfflineCopy(currentSettings())}
          disabled={!offlineCopyAvailable}
          title={offlineCopyAvailable ? OFFLINE_FILE_NAME : "Dev server: use the built file (npm run build) to download"}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 2v8M4.5 6.5 8 10l3.5-3.5M3 13h10" />
          </svg>
          Download offline copy
          {offlineCopyAvailable ? <span className="download-size">{offlineCopyKb} KB</span> : null}
        </button>
      </header>

      <div className="layout">
        <aside className="sidebar" aria-label="Configuration">
          <section className="group">
            <h2 className="group-title">Transmission</h2>
            <div className="field">
              <label htmlFor="trans-search">Search</label>
              <input
                id="trans-search"
                type="search"
                value={query}
                placeholder="T5 Ford, NV4500, 2.95…"
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="trans-scope">Filter by</label>
              <select id="trans-scope" value={scope} onChange={(event) => setScope(event.target.value)}>
                {scopes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {selection ? (
              <>
                <div className="field">
                  <label htmlFor="trans-model">Model</label>
                  <select
                    id="trans-model"
                    value={selection.family.model}
                    onChange={(event) => {
                      setSelectedModel(event.target.value);
                      setSelectedVariantName("");
                    }}
                  >
                    {filteredFamilies.map((family) => (
                      <option key={family.model} value={family.model}>
                        {family.manufacturer} {family.model}
                        {family.variants.length > 1 ? ` (${family.variants.length})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                {selection.family.variants.length > 1 ? (
                  <div className="field">
                    <label htmlFor="trans-variant">Variant</label>
                    <select
                      id="trans-variant"
                      value={selection.variant.name}
                      onChange={(event) => {
                        setSelectedModel(selection.family.model);
                        setSelectedVariantName(event.target.value);
                      }}
                    >
                      {selection.family.variants.map((variant) => (
                        <option key={variant.name} value={variant.name}>
                          {variant.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                <ol className="ratio-chips" aria-label="Gear ratios">
                  {gears.map((gear) => (
                    <li key={gear.label} style={{ borderColor: gear.color }}>
                      <span>{gear.label}</span>
                      {gear.ratio.toFixed(2)}
                    </li>
                  ))}
                </ol>
                {selection.variant.source ? (
                  <details className="source">
                    <summary>Ratio source</summary>
                    <p>{selection.variant.source}</p>
                  </details>
                ) : null}
              </>
            ) : (
              <p className="empty" role="status">
                No transmissions match this search.
              </p>
            )}
          </section>

          <section className="group">
            <h2 className="group-title">Tires &amp; axle</h2>
            <TireField
              mode={tireMode}
              onModeChange={setTireMode}
              diameterIn={tireDiameterIn}
              onDiameterChange={setTireDiameterIn}
              size={tireSize}
              onSizeChange={setTireSize}
            />
            <NumberField label="Axle ratio" unit=":1" step={0.01} min={0.5} value={axleRatio} onCommit={setAxleRatio} />
          </section>

          <section className="group">
              <h2 className="group-title">Engine</h2>
              <Segmented
                label="RPM input"
                value={rpmMode}
                onChange={setRpmMode}
                options={[
                  { value: "shift", label: "Shift point" },
                  { value: "range", label: "RPM range" },
                ]}
              />
              {rpmMode === "shift" ? (
                <NumberField
                  label="Shift at"
                  unit="rpm"
                  step={100}
                  min={500}
                  max={20000}
                  value={shiftRpm}
                  onCommit={setShiftRpm}
                />
              ) : (
                <div className="field-row">
                  <NumberField label="Min" unit="rpm" step={100} value={minRpm} onCommit={setMinRpm} />
                  <NumberField label="Max" unit="rpm" step={100} min={500} max={20000} value={maxRpm} onCommit={setMaxRpm} />
                </div>
              )}
            </section>
        </aside>

        <main className="content">
          {gears.length === 0 ? (
            <section className="card empty-card">
              <h2>No transmission selected</h2>
            </section>
          ) : (
            <>
              <section className="stats" aria-label="Key numbers">
                <div className="stat">
                  <p className="stat-label">Top speed</p>
                  <p className="stat-value">
                    {speedAt(topRpm, topGear.ratio).toFixed(0)}
                    <span>mph</span>
                  </p>
                  <p className="stat-note">
                    {topGear.label} at {topRpm.toLocaleString()} rpm
                  </p>
                </div>
                <div className="stat">
                  <p className="stat-label">1st gear runs to</p>
                  <p className="stat-value">
                    {speedAt(topRpm, gears[0].ratio).toFixed(0)}
                    <span>mph</span>
                  </p>
                  <p className="stat-note">Ratio {gears[0].ratio.toFixed(2)}</p>
                </div>
                <div className="stat">
                  <p className="stat-label">Biggest RPM drop</p>
                  <p className="stat-value">
                    {biggestShift ? `−${Math.round(biggestShift.drop).toLocaleString()}` : "—"}
                    <span>rpm</span>
                  </p>
                  <p className="stat-note">
                    {biggestShift ? `${biggestShift.from.label} → ${biggestShift.to.label}` : "Single-speed"}
                  </p>
                </div>
                <div className="stat">
                  <p className="stat-label">Cruise at {HIGHWAY_MPH} mph</p>
                  <p className="stat-value">
                    {Math.round(rpmAt(HIGHWAY_MPH, topGear.ratio)).toLocaleString()}
                    <span>rpm</span>
                  </p>
                  <p className="stat-note">In {topGear.label}</p>
                </div>
              </section>

              <section className="card">
                <header className="card-header">
                  <div>
                    <h2>RPM vs road speed</h2>
                    <p className="card-subtitle">
                      {selection?.family.manufacturer} {selection?.family.model} · {selection?.variant.name} ·{" "}
                      {axleRatio.toFixed(2)} axle · {tireLabel}
                    </p>
                  </div>
                </header>
                <GearChart
                  gears={gears}
                  tireDiameter={tireDiameter}
                  axleRatio={axleRatio}
                  mode={rpmMode}
                  minRpm={low}
                  maxRpm={high}
                  shiftRpm={shiftRpm}
                />
              </section>

              <section className="card">
                <header className="card-header">
                  <h2>Gearset</h2>
                  <Segmented
                    label="Gearset view"
                    size="small"
                    value={gearsetView}
                    onChange={setGearsetView}
                    options={[
                      { value: "ladder", label: "Ratio ladder" },
                      { value: "cruising", label: "Cruising RPM" },
                    ]}
                  />
                </header>

                {gearsetView === "ladder" ? (
                  <div className="table-scroll">
                    <table className="data-table ladder">
                      <thead>
                        <tr>
                          <th scope="col">Gear</th>
                          <th scope="col" className="num">
                            Ratio
                          </th>
                          <th scope="col" className="bar-col">
                            <span className="visually-hidden">Ratio relative to 1st</span>
                          </th>
                          <th scope="col" className="num">
                            Step
                          </th>
                          <th scope="col" className="num">
                            Lands at
                          </th>
                          <th scope="col" className="num">
                            Speed at {topRpm.toLocaleString()}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {gears.map((gear, index) => {
                          const shift = index === 0 ? null : shifts[index - 1];
                          return (
                            <tr key={gear.label}>
                              <th scope="row">
                                <span className="legend-swatch" style={{ background: gear.color }} />
                                {gear.label}
                              </th>
                              <td className="num strong">{gear.ratio.toFixed(2)}</td>
                              <td className="bar-col">
                                <span
                                  className="ratio-bar"
                                  style={{ width: `${(gear.ratio / gears[0].ratio) * 100}%`, background: gear.color }}
                                />
                              </td>
                              <td className="num">{shift ? `−${Math.round(shift.step * 100)}%` : "—"}</td>
                              <td className="num">{shift ? `${Math.round(shift.landing).toLocaleString()} rpm` : "—"}</td>
                              <td className="num">{speedAt(topRpm, gear.ratio).toFixed(1)} mph</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="table-scroll">
                    <table className="data-table cruising">
                      <thead>
                        <tr>
                          <th scope="col">Gear</th>
                          {CRUISE_SPEEDS.map((mph) => (
                            <th scope="col" className="num" key={mph}>
                              {mph} mph
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {gears.map((gear) => (
                          <tr key={gear.label}>
                            <th scope="row">
                              <span className="legend-swatch" style={{ background: gear.color }} />
                              {gear.label}
                            </th>
                            {CRUISE_SPEEDS.map((mph) => {
                              const rpm = rpmAt(mph, gear.ratio);
                              const usable = rpm >= LUGGING_RPM && rpm <= topRpm;
                              const best = bestCruiseGear.get(mph) === gear.label;
                              return (
                                <td
                                  className={best ? "num best" : usable ? "num" : "num muted"}
                                  key={mph}
                                  aria-label={best ? `${Math.round(rpm)} rpm, best gear at ${mph} mph` : undefined}
                                >
                                  {usable ? Math.round(rpm).toLocaleString() : "—"}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="footnote">
                      Bold: lowest RPM ≥ {CRUISE_FLOOR_RPM.toLocaleString()}. Shown: {LUGGING_RPM.toLocaleString()}–
                      {topRpm.toLocaleString()} rpm.
                    </p>
                  </div>
                )}
              </section>

              <PowerCard
                state={power}
                onChange={changePower}
                curve={powerCurve.curve}
                error={powerCurve.error}
                basis={powerCurve.basis}
                drivetrainLoss={vehicle.drivetrainLoss}
              />
              <QuarterMileCard
                vehicle={vehicle}
                onVehicleChange={setVehicle}
                curve={powerCurve.curve}
                curveBasis={powerCurve.basis}
                gears={gears}
                axleRatio={axleRatio}
                tireDiameterIn={tireDiameter}
                shiftRpm={topRpm}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
