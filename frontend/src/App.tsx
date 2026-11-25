import { useMemo, useState } from "react";
import { rpmForSpeed, speedMph } from "./calculations";
import { GENERIC_AUTOMATIC, type AutomaticSetup } from "./automatic";
import { familyKind, transmissionFamilies } from "./catalog";
import { AutomaticPane } from "./components/AutomaticPane";
import { CustomTransmissionDialog } from "./components/CustomTransmissionDialog";
import { CUSTOM_MANUFACTURER, customFamily, type CustomTransmission } from "./customTransmissions";
import { GearChart, type Gear } from "./components/GearChart";
import { NumberField } from "./components/NumberField";
import { Segmented } from "./components/Segmented";
import { SiteFooter } from "./components/SiteFooter";
import { PowerCurves, PowerInputs } from "./components/PowerCard";
import { CarInputs, ManualInputs, QuarterMileCard, TractionInputs } from "./components/QuarterMileCard";
import { Subgroup } from "./components/Subgroup";
import { TireField, type TireMode } from "./components/TireField";
import { readEmbeddedSettings, type AppSettings } from "./appState";
import { downloadOfflineCopy, OFFLINE_FILE_NAME, offlineCopyAvailable, offlineCopyKb } from "./offline";
import { buildCurve, DEFAULT_POWER, type PowerState } from "./power";
import { DEFAULT_VEHICLE, type VehicleSetup } from "./quarterMile";
import { parseTireSize } from "./tires";
import { ALL_SCOPE, filterFamilies, resolveSelection, scopeOptions } from "./transmissionSearch";

// Gear colors in fixed order (validated for CVD separation on the dark chart surface).
// Color follows the gear, so 1st is always the same blue whatever transmission is shown.
const GEAR_COLORS = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#0ca30c", "#9085e9", "#e66767"];
const ORDINALS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"];
const CRUISE_SPEEDS = [10, 20, 30, 40, 50, 60, 70, 80];
const HIGHWAY_MPH = 65;
const LUGGING_RPM = 800;
const CRUISE_FLOOR_RPM = 1200;

export function App() {
  // Defaults, or the settings embedded in this page by a previous "Download offline copy".
  const [initial] = useState(() => readEmbeddedSettings(document));
  const [customTransmissions, setCustomTransmissions] = useState<CustomTransmission[]>(initial.customTransmissions);
  const [autoSetups, setAutoSetups] = useState<Record<string, AutomaticSetup>>(initial.autoSetups);
  // Custom transmission editor: what's being edited (null = closed) and the name it had, if existing.
  const [customDraft, setCustomDraft] = useState<CustomTransmission | null>(null);
  const [editingCustom, setEditingCustom] = useState<string | null>(null);
  const families = useMemo(() => [...transmissionFamilies, ...customTransmissions.map(customFamily)], [customTransmissions]);
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
  const [shiftRpm, setShiftRpm] = useState(initial.shiftRpm);
  const [gearsetView, setGearsetView] = useState<"ladder" | "cruising">(initial.gearsetView);
  const [chartView, setChartView] = useState<"shifts" | "full">(initial.chartView);
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

  // Automatic transmissions: the user's settings for this transmission, or its defaults.
  const isAutomatic = selection ? familyKind(selection.family) === "automatic" : false;
  const automaticDefaults = selection?.family.automatic ?? GENERIC_AUTOMATIC;
  const automaticSetup = (selection && autoSetups[selection.family.model]) || automaticDefaults;
  const changeAutomaticSetup = (next: AutomaticSetup) => {
    if (!selection) return;
    const model = selection.family.model;
    setAutoSetups((current) => {
      const { [model]: _previous, ...rest } = current;
      return JSON.stringify(next) === JSON.stringify(automaticDefaults) ? rest : { ...rest, [model]: next };
    });
  };
  const drivetrainLoss = isAutomatic ? automaticSetup.drivetrainLoss : vehicle.drivetrainLoss;

  const selectedCustom = selection?.family.manufacturer === CUSTOM_MANUFACTURER ? selection.family.model : null;
  const openNewCustom = () => {
    setEditingCustom(null);
    setCustomDraft({ name: "My transmission", kind: "manual", ratios: [2.95, 1.94, 1.34, 1.0, 0.73] });
  };
  const openCopyAsCustom = () => {
    if (!selection) return;
    setEditingCustom(null);
    setCustomDraft({
      name: `${selection.family.model} custom`,
      kind: familyKind(selection.family),
      ratios: [...selection.variant.gear_ratios],
      automatic: isAutomatic ? automaticSetup : undefined,
    });
  };
  const openEditCustom = () => {
    const custom = customTransmissions.find((item) => item.name === selectedCustom);
    if (!custom) return;
    setEditingCustom(custom.name);
    setCustomDraft(custom);
  };
  const saveCustom = (custom: CustomTransmission, previousName: string | null) => {
    setCustomTransmissions((current) =>
      previousName ? current.map((item) => (item.name === previousName ? custom : item)) : [...current, custom],
    );
    if (previousName && previousName !== custom.name) {
      setAutoSetups((current) => {
        const { [previousName]: moved, ...rest } = current;
        return moved ? { ...rest, [custom.name]: moved } : rest;
      });
    }
    // Show the saved transmission: clear search/filter if they'd hide it.
    setQuery("");
    setScope(ALL_SCOPE);
    setSelectedModel(custom.name);
    setSelectedVariantName("");
    setCustomDraft(null);
  };
  const deleteCustom = (name: string) => {
    setCustomTransmissions((current) => current.filter((item) => item.name !== name));
    setAutoSetups((current) => {
      const { [name]: _removed, ...rest } = current;
      return rest;
    });
    setCustomDraft(null);
  };

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
    shiftRpm,
    gearsetView,
    chartView,
    power,
    vehicle,
    customTransmissions,
    autoSetups,
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

  const topRpm = shiftRpm;
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

  const transmissionSummary = selection ? `${selection.family.manufacturer} ${selection.family.model} · ${selection.variant.name}` : "";

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

      <main className="page">

        <section className="card">
          <header className="card-header">
            <div>
              <h2>Transmission</h2>
              <p className="card-subtitle">{transmissionSummary}</p>
            </div>
          </header>
          <div className="split">
            <div className="split-inputs">
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
              <div className="custom-links">
                <button type="button" className="text-button" onClick={openNewCustom}>
                  + New custom
                </button>
                {selection && !selectedCustom ? (
                  <button type="button" className="text-button" onClick={openCopyAsCustom}>
                    Copy as custom
                  </button>
                ) : null}
                {selectedCustom ? (
                  <button type="button" className="text-button" onClick={openEditCustom}>
                    Edit custom
                  </button>
                ) : null}
              </div>
              {isAutomatic ? (
                <AutomaticPane setup={automaticSetup} defaults={automaticDefaults} onChange={changeAutomaticSetup} />
              ) : (
                <Subgroup title="Shifts & clutch">
                  <ManualInputs vehicle={vehicle} onVehicleChange={setVehicle} curveBasis={powerCurve.basis} />
                </Subgroup>
              )}
            </div>
            <div className="split-results">
              {gears.length === 0 ? (
                <p className="empty">No transmission selected.</p>
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
                      {biggestShift ? Math.round(biggestShift.drop).toLocaleString() : "—"}
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
                  <section className="panel">
                    <header className="card-header">
                      <div>
                        <h3>RPM vs road speed</h3>
                        <p className="card-subtitle">
                          {selection?.family.manufacturer} {selection?.family.model} · {selection?.variant.name} ·{" "}
                          {axleRatio.toFixed(2)} axle · {tireLabel}
                        </p>
                      </div>
                      <Segmented
                        label="RPM chart view"
                        size="small"
                        value={chartView}
                        onChange={setChartView}
                        options={[
                          { value: "shifts", label: "Shifts" },
                          { value: "full", label: "Full range" },
                        ]}
                      />
                    </header>
                    <GearChart
                      gears={gears}
                      tireDiameter={tireDiameter}
                      axleRatio={axleRatio}
                      shiftRpm={shiftRpm}
                      view={chartView}
                    />
                  </section>

                  <section className="panel">
                    <header className="card-header">
                      <h3>Gearset</h3>
                      <Segmented
                        label="Gearset view"
                        size="small"
                        value={gearsetView}
                        onChange={setGearsetView}
                        options={[
                          { value: "cruising", label: "Cruising RPM" },
                          { value: "ladder", label: "Ratio ladder" },
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
                </>
              )}
            </div>
          </div>
        </section>

        <section className="card">
          <header className="card-header">
            <div>
              <h2>Engine</h2>
            </div>
          </header>
          <div className="split">
            <div className="split-inputs">
              <PowerInputs state={power} onChange={changePower} error={powerCurve.error} drivetrainLoss={drivetrainLoss} />
              <Subgroup title="Shift point">
                <NumberField label="Shift at" unit="rpm" step={100} min={500} max={20000} value={shiftRpm} onCommit={setShiftRpm} />
              </Subgroup>
            </div>
            <PowerCurves curve={powerCurve.curve} basis={powerCurve.basis} />
          </div>
        </section>

        <div className="card-pair">
          <section className="card">
            <header className="card-header">
              <div>
                <h2>Axle &amp; tires</h2>
                <p className="card-subtitle">{axleRatio.toFixed(2)} axle · {tireLabel}</p>
              </div>
            </header>
            <div className="input-grid">
              <NumberField label="Axle ratio" unit=":1" step={0.01} min={0.5} value={axleRatio} onCommit={setAxleRatio} />
              <TireField
                mode={tireMode}
                onModeChange={setTireMode}
                diameterIn={tireDiameterIn}
                onDiameterChange={setTireDiameterIn}
                size={tireSize}
                onSizeChange={setTireSize}
              />
              <TractionInputs vehicle={vehicle} onVehicleChange={setVehicle} />
            </div>
          </section>
          <section className="card">
            <header className="card-header">
              <div>
                <h2>Car</h2>
                <p className="card-subtitle">{vehicle.weightLb.toLocaleString()} lb</p>
              </div>
            </header>
            <div className="input-grid">
              <CarInputs vehicle={vehicle} onVehicleChange={setVehicle} />
            </div>
          </section>
        </div>

        {gears.length > 0 ? (
          <QuarterMileCard
            vehicle={vehicle}
            curve={powerCurve.curve}
            curveBasis={powerCurve.basis}
            automatic={isAutomatic ? automaticSetup : null}
            gears={gears}
            axleRatio={axleRatio}
            tireDiameterIn={tireDiameter}
            shiftRpm={topRpm}
          />
        ) : null}
      </main>
      <SiteFooter />
      <CustomTransmissionDialog
        draft={customDraft}
        editingName={editingCustom}
        takenNames={families.map((family) => family.model).filter((model) => model !== editingCustom)}
        onSave={saveCustom}
        onDelete={deleteCustom}
        onClose={() => setCustomDraft(null)}
      />
    </div>
  );
}
