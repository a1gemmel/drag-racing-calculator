import { useEffect, useMemo, useState } from "react";
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
import { airFor, CarInputs, ManualInputs, QuarterMileCard, TireInputs } from "./components/QuarterMileCard";
import { Subgroup } from "./components/Subgroup";
import { TireField, type TireMode } from "./components/TireField";
import { MAX_CAR_NAME, MAX_CARS, readEmbeddedSettings, type AppSettings, type CarSetup, type TrackConditions } from "./appState";
import { CarTabs } from "./components/CarTabs";
import { SimpleView } from "./components/SimpleView";
import type { SimpleSetup } from "./simplePass";
import { settingsFromToken, settingsToToken, shareUrl } from "./shareToken";
import { downloadOfflineCopy, OFFLINE_FILE_NAME, offlineCopyAvailable, offlineCopyKb } from "./offline";
import { buildCurve, type PowerState } from "./power";
import { airCorrectedCurve, bestShiftRpm, type VehicleSetup } from "./quarterMile";
import type { TransmissionFamily } from "./catalog";
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
// Car colors in the compared simulation charts: the same validated categorical order, by car tab,
// unless the user picked one.
const CAR_COLORS = GEAR_COLORS;
const carColor = (car: CarSetup, index: number) => car.color || CAR_COLORS[index % CAR_COLORS.length];

const MODE_KEY = "drag-racing-calculator:mode";
const PHONE_NOTICE_KEY = "drag-racing-calculator:phone-notice";
/** Small preferences (simple/full, notice seen) in browser storage; ignored where storage is unavailable. */
function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStored(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage blocked (private mode, some file:// pages): the choice lasts for this visit only.
  }
}
/** Phones get simple mode by default. */
const PHONE_QUERY = "(max-width: 700px)";
function resolveMode(saved: AppSettings["mode"]): { mode: "simple" | "full"; byScreen: boolean } {
  if (saved !== "auto") return { mode: saved, byScreen: false };
  const stored = readStored(MODE_KEY);
  if (stored === "simple" || stored === "full") return { mode: stored, byScreen: false };
  const phone = typeof window.matchMedia === "function" && window.matchMedia(PHONE_QUERY).matches;
  return { mode: phone ? "simple" : "full", byScreen: true };
}

/** What the page needs from one car's setup: its transmission pick, gears, tire, power curve, automatic setup. */
function deriveCar(car: CarSetup, families: TransmissionFamily[]) {
  const filteredFamilies = filterFamilies(families, car.scope, car.query);
  // The user's last pick. If a search or filter hides it, resolveSelection falls back to the first match.
  const selection = resolveSelection(filteredFamilies, car.selectedModel, car.selectedVariantName);
  const parsedTire = car.tireMode === "size" ? parseTireSize(car.tireSize) : null;
  // Speed math uses the rolling diameter: as entered in diameter mode, size math minus the rolling correction otherwise.
  const tireDiameter = parsedTire ? parsedTire.effectiveDiameterIn : car.tireDiameterIn;
  const tireLabel = parsedTire ? `${parsedTire.label} (${tireDiameter.toFixed(1)}″)` : `${tireDiameter}″ tire`;
  const isAutomatic = selection ? familyKind(selection.family) === "automatic" : false;
  const automaticDefaults = selection?.family.automatic ?? GENERIC_AUTOMATIC;
  const automaticSetup = (selection && car.autoSetups[selection.family.model]) || automaticDefaults;
  const gears: Gear[] = (selection?.variant.gear_ratios ?? []).map((ratio, index) => ({
    label: ORDINALS[index] ?? `${index + 1}`,
    ratio,
    color: GEAR_COLORS[index % GEAR_COLORS.length],
  }));
  return { filteredFamilies, selection, tireDiameter, tireLabel, isAutomatic, automaticDefaults, automaticSetup, gears, powerCurve: buildCurve(car.power) };
}

export function App() {
  // A share link's settings, else those embedded by a previous "Download offline copy", else defaults.
  const [initial] = useState(() => (window.location.hash ? settingsFromToken(window.location.hash) : null) ?? readEmbeddedSettings(document));
  const [linkCopied, setLinkCopied] = useState(false);
  const [customTransmissions, setCustomTransmissions] = useState<CustomTransmission[]>(initial.customTransmissions);
  const [cars, setCars] = useState<CarSetup[]>(initial.cars);
  const [activeCar, setActiveCar] = useState(initial.activeCar);
  const [conditions, setConditions] = useState<TrackConditions>(initial.conditions);
  const [simple, setSimple] = useState<SimpleSetup>(initial.simple);
  // Simple (phones) or full: a link or saved copy's mode, else the user's last choice, else by screen size.
  const [modeInfo] = useState(() => resolveMode(initial.mode));
  const [mode, setModeState] = useState<"simple" | "full">(modeInfo.mode);
  const [phoneNotice, setPhoneNotice] = useState(modeInfo.byScreen && modeInfo.mode === "simple" && !readStored(PHONE_NOTICE_KEY));
  const setMode = (next: "simple" | "full") => {
    setModeState(next);
    writeStored(MODE_KEY, next);
  };
  const closePhoneNotice = (next?: "full") => {
    writeStored(PHONE_NOTICE_KEY, "1");
    setPhoneNotice(false);
    if (next) setMode(next);
  };
  const car = cars[activeCar] ?? cars[0];
  // Changes to the open car. A function patch sees the car's latest state.
  const updateCar = (patch: Partial<CarSetup> | ((current: CarSetup) => Partial<CarSetup>)) =>
    setCars((current) => current.map((item, index) => (index === activeCar ? { ...item, ...(typeof patch === "function" ? patch(item) : patch) } : item)));
  // Custom transmissions are shared, so renames and deletes reach every car's automatic settings.
  const updateAllAutoSetups = (change: (setups: Record<string, AutomaticSetup>) => Record<string, AutomaticSetup>) =>
    setCars((current) => current.map((item) => ({ ...item, autoSetups: change(item.autoSetups) })));
  // Custom transmission editor: what's being edited (null = closed) and the name it had, if existing.
  const [customDraft, setCustomDraft] = useState<CustomTransmission | null>(null);
  const [editingCustom, setEditingCustom] = useState<string | null>(null);
  const families = useMemo(() => [...transmissionFamilies, ...customTransmissions.map(customFamily)], [customTransmissions]);
  const { query, scope, selectedModel, selectedVariantName, tireMode, tireDiameterIn, tireSize, axleRatio, shiftRpm, power, vehicle, autoSetups } = car;
  const setQuery = (value: string) => updateCar({ query: value });
  const setScope = (value: string) => updateCar({ scope: value });
  const setSelectedModel = (value: string) => updateCar({ selectedModel: value });
  const setSelectedVariantName = (value: string) => updateCar({ selectedVariantName: value });
  const setTireMode = (value: TireMode) => updateCar({ tireMode: value });
  const setTireDiameterIn = (value: number) => updateCar({ tireDiameterIn: value });
  const setTireSize = (value: string) => updateCar({ tireSize: value });
  const setAxleRatio = (value: number) => updateCar({ axleRatio: value });
  const setShiftRpm = (value: number) => updateCar({ shiftRpm: value });
  const setVehicle = (value: VehicleSetup) => updateCar({ vehicle: value });
  const [gearsetView, setGearsetView] = useState<"ladder" | "cruising">(initial.gearsetView);
  // Gearing (top-speed numbers, RPM chart, gearset tables): open for one car, folded away when comparing.
  const comparing = cars.length > 1;
  const [gearingOpen, setGearingOpen] = useState(!comparing);
  useEffect(() => setGearingOpen(!comparing), [comparing]);
  const [chartView, setChartView] = useState<"shifts" | "full">(initial.chartView);
  const derived = useMemo(() => cars.map((item) => deriveCar(item, families)), [cars, families]);
  const { selection, filteredFamilies, tireDiameter, tireLabel, powerCurve, isAutomatic, automaticDefaults, automaticSetup } = derived[activeCar] ?? derived[0];
  // Trap-speed weight drives the sim's race weight (one way: editing race weight leaves the trap pass alone).
  const changePower = (next: PowerState) =>
    updateCar((current) => ({
      power: next,
      vehicle: next.trapWeightLb !== current.power.trapWeightLb ? { ...current.vehicle, weightLb: next.trapWeightLb } : current.vehicle,
    }));

  const scopes = useMemo(() => scopeOptions(families), [families]);

  // Automatic transmissions: the user's settings for this transmission, or its defaults.
  const changeAutomaticSetup = (next: AutomaticSetup) => {
    if (!selection) return;
    const model = selection.family.model;
    updateCar((current) => {
      const { [model]: _previous, ...rest } = current.autoSetups;
      return { autoSetups: JSON.stringify(next) === JSON.stringify(automaticDefaults) ? rest : { ...rest, [model]: next } };
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
      updateAllAutoSetups((current) => {
        const { [previousName]: moved, ...rest } = current;
        return moved ? { ...rest, [custom.name]: moved } : rest;
      });
      // Other cars on the renamed transmission follow it.
      setCars((current) => current.map((item) => (item.selectedModel === previousName ? { ...item, selectedModel: custom.name } : item)));
    }
    // Show the saved transmission: clear search/filter if they'd hide it.
    updateCar({ query: "", scope: ALL_SCOPE, selectedModel: custom.name, selectedVariantName: "" });
    setCustomDraft(null);
  };
  const deleteCustom = (name: string) => {
    setCustomTransmissions((current) => current.filter((item) => item.name !== name));
    updateAllAutoSetups((current) => {
      const { [name]: _removed, ...rest } = current;
      return rest;
    });
    setCustomDraft(null);
  };

  const currentSettings = (): AppSettings => ({
    // Save what's actually shown, which may be a fallback if a search hid a car's last pick.
    cars: cars.map((item, index) => ({
      ...item,
      selectedModel: derived[index]?.selection?.family.model ?? item.selectedModel,
      selectedVariantName: derived[index]?.selection?.variant.name ?? item.selectedVariantName,
    })),
    activeCar,
    gearsetView,
    chartView,
    conditions,
    customTransmissions,
    simple,
    mode,
  });

  // Car tabs.
  const addCar = () => {
    if (cars.length >= MAX_CARS) return;
    const used = new Set(cars.map((item) => item.name));
    let n = cars.length + 1;
    while (used.has(`Car ${n}`)) n += 1;
    // A new car starts as a copy of the open one, so a comparison changes one thing at a time.
    setCars((current) => [...current, { ...car, name: `Car ${n}`, color: "" }]);
    setActiveCar(cars.length);
  };
  const removeCar = (index: number) => {
    if (cars.length <= 1) return;
    setCars((current) => current.filter((_, i) => i !== index));
    setActiveCar((current) => (current > index ? current - 1 : current === index ? Math.max(0, index - 1) : current));
  };
  const renameCar = (name: string) => updateCar({ name: name.slice(0, MAX_CAR_NAME) });

  // The address bar isn't updated as settings change; Copy link makes a link to the setup on screen.
  // A link pasted into the address bar of an open page (no reload) loads that setup.
  useEffect(() => {
    const onHashChange = () => window.location.reload();
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  const copyLink = () => {
    // From a downloaded copy (file://) the link points at the published site instead of a local file.
    const url = shareUrl(window.location.href, settingsToToken(currentSettings()));
    navigator.clipboard?.writeText(url).then(
      () => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      },
      () => window.prompt("Link", url),
    ) ?? window.prompt("Link", url);
  };

  // Every car's quarter-mile inputs, for the overlaid simulation.
  const simCars = derived.flatMap((item, index) =>
    item.gears.length && item.powerCurve.curve
      ? [
          {
            name: cars[index].name,
            color: carColor(cars[index], index),
            gears: item.gears,
            input: {
              ...cars[index].vehicle,
              curve: item.powerCurve.curve,
              curveBasis: item.powerCurve.basis,
              automatic: item.isAutomatic ? item.automaticSetup : undefined,
              gearRatios: item.gears.map((g) => g.ratio),
              axleRatio: cars[index].axleRatio,
              tireDiameterIn: item.tireDiameter,
              shiftRpm: cars[index].shiftRpm,
            },
            active: index === activeCar,
          },
        ]
      : [],
  );

  const { gears } = derived[activeCar] ?? derived[0];
  // Shift point with the quickest ET for the open car, at the current track conditions.
  const activeSim = simCars.find((item) => item.active);
  const autoShift = () => {
    if (!activeSim) return;
    const air = airFor(conditions);
    setShiftRpm(bestShiftRpm({ ...activeSim.input, curve: airCorrectedCurve(activeSim.input.curve, air.ratio), airDensityRatio: air.ratio }));
  };

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
        <Segmented<"simple" | "full">
          label="Page version"
          size="small"
          value={mode}
          onChange={setMode}
          options={[
            { value: "simple", label: "Simple" },
            { value: "full", label: "Full" },
          ]}
        />
        <div className="topbar-actions">
          <button type="button" className="download-button" onClick={copyLink} aria-live="polite">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M6.5 9.5 9.5 6.5M7 4.5l1.2-1.2a2.5 2.5 0 0 1 3.5 3.5L10.5 8M9 11.5l-1.2 1.2a2.5 2.5 0 0 1-3.5-3.5L5.5 8" />
            </svg>
            {linkCopied ? "Link copied" : "Copy link"}
          </button>
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
        </div>
      </header>

      <main className="page">
        {mode === "simple" ? (
          <SimpleView setup={simple} onChange={setSimple} />
        ) : (
        <>
        <div className="car-setup">
          <CarTabs
            cars={cars.map((item, index) => ({ name: item.name, color: carColor(item, index) }))}
            active={activeCar}
            onSelect={setActiveCar}
            onAdd={addCar}
            onRemove={removeCar}
            onRename={renameCar}
          onColor={(color) => updateCar({ color })}
            canAdd={cars.length < MAX_CARS}
          />
          <section className="card">
            <header className="card-header">
              <div>
                <h2>Transmission</h2>
                <p className="card-subtitle">{transmissionSummary}</p>
              </div>
              <button type="button" className="disclosure-button" aria-expanded={gearingOpen} aria-controls="gearing" onClick={() => setGearingOpen((open) => !open)}>
                Gearing
                <svg viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M3 4.5 6 7.5 9 4.5" />
                </svg>
              </button>
            </header>
            <div className={gearingOpen ? "split" : "split collapsed"}>
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
              {gearingOpen ? (
              <div className="split-results" id="gearing">
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
              ) : null}
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
                  <NumberField
                    label="Shift at"
                    unit="rpm"
                    step={50}
                    min={500}
                    max={20000}
                    value={shiftRpm}
                    onCommit={setShiftRpm}
                    action={
                      <button type="button" className="mini-button" onClick={autoShift} disabled={!activeSim} title="Quickest ET for this car">
                        Auto
                      </button>
                    }
                  />
                </Subgroup>
              </div>
              <PowerCurves curve={powerCurve.curve} basis={powerCurve.basis} />
            </div>
          </section>

          <div className="card-pair">
            <section className="card">
              <header className="card-header">
                <div>
                  <h2>Car</h2>
                  <p className="card-subtitle">
                    {vehicle.weightLb.toLocaleString()} lb · {axleRatio.toFixed(2)} axle
                  </p>
                </div>
              </header>
              <div className="input-grid">
                <CarInputs vehicle={vehicle} onVehicleChange={setVehicle} axleRatio={axleRatio} onAxleRatioChange={setAxleRatio} />
              </div>
            </section>
            <section className="card">
              <header className="card-header">
                <div>
                  <h2>Tires</h2>
                  <p className="card-subtitle">{tireLabel}</p>
                </div>
              </header>
              <div className="input-grid">
                <TireField
                  mode={tireMode}
                  onModeChange={setTireMode}
                  diameterIn={tireDiameterIn}
                  onDiameterChange={setTireDiameterIn}
                  size={tireSize}
                  onSizeChange={setTireSize}
                />
                <TireInputs vehicle={vehicle} onVehicleChange={setVehicle} />
              </div>
            </section>
          </div>

        </div>

        <QuarterMileCard cars={simCars} conditions={conditions} onConditionsChange={setConditions} />
        </>
        )}
      </main>
      {phoneNotice ? (
        <div className="notice-backdrop">
          <div className="notice" role="dialog" aria-modal="true" aria-labelledby="phone-notice-title">
            <h2 id="phone-notice-title">Simple version</h2>
            <p>
              You are viewing the simplified model optimized for small screens. Switch any time to Full mode at the top of
              the page.
            </p>
            <div className="notice-actions">
              <button type="button" className="button" onClick={() => closePhoneNotice()}>
                OK
              </button>
              <button type="button" className="button button-ghost" onClick={() => closePhoneNotice("full")}>
                Use full version
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
