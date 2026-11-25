import { useEffect, useState } from "react";
import {
  curvePeaks,
  horsepower,
  hpFromTrap,
  parseDynoText,
  powerBasis,
  quarterTrapMph,
  torqueFromHp,
  type CurvePoint,
  type PowerBasis,
  type PowerCurve,
  type PowerMethod,
  type PowerState,
  type TrapDistance,
} from "../power";
import { LineChart } from "./LineChart";
import { NumberField } from "./NumberField";
import { Segmented } from "./Segmented";

type InputProps = {
  state: PowerState;
  onChange: (state: PowerState) => void;
  error: string | null;
  /** Fraction lost between crank and wheels, for showing the trap estimate at the wheels. */
  drivetrainLoss: number;
};

const TORQUE_COLOR = "#3987e5";
const HP_COLOR = "#d95926";

/** Engine power inputs for the sidebar: the input method and its fields. */
export function PowerInputs({ state, onChange, error, drivetrainLoss }: InputProps) {
  const set = (patch: Partial<PowerState>) => onChange({ ...state, ...patch });
  const eighth = state.trapDistance === "eighth";
  const trapHp = hpFromTrap(state.trapWeightLb, quarterTrapMph(state));
  const hpUnit = powerBasis(state) === "wheel" ? "whp" : "hp";
  const basisToggle = (value: PowerBasis, onBasis: (basis: PowerBasis) => void) => (
    <div className="field">
      <span className="field-label">Measured at</span>
      <Segmented<PowerBasis>
        label="Measured at"
        size="small"
        value={value}
        onChange={onBasis}
        options={[
          { value: "crank", label: "Crank" },
          { value: "wheel", label: "Wheel" },
        ]}
      />
    </div>
  );

  return (
    <>
      <div className="field">
        <span className="field-label">Power from</span>
        <Segmented<PowerMethod>
          label="Power input method"
          size="small"
          value={state.method}
          onChange={(method) => set({ method })}
          options={[
            { value: "trap", label: "Trap speed" },
            { value: "peak", label: "Peak #s" },
            { value: "dyno", label: "Dyno" },
          ]}
        />
      </div>
      {state.method === "trap" ? (
        <>
          <p className="hint">Use a known pass to estimate wheel horsepower</p>
          <div className="field">
            <span className="field-label">Trap at</span>
            <Segmented<TrapDistance>
              label="Trap at"
              size="small"
              value={state.trapDistance}
              onChange={(trapDistance) => set({ trapDistance })}
              options={[
                { value: "quarter", label: "1/4 mile" },
                { value: "eighth", label: "1/8 mile" },
              ]}
            />
          </div>
          <div className="field-row">
            {eighth ? (
              <NumberField
                key="eighth"
                label="1/8 mile trap"
                unit="mph"
                step={0.1}
                min={15}
                max={250}
                value={state.trapEighthMph}
                onCommit={(trapEighthMph) => set({ trapEighthMph })}
              />
            ) : (
              <NumberField key="quarter" label="Trap speed" unit="mph" step={0.1} min={20} max={300} value={state.trapMph} onCommit={(trapMph) => set({ trapMph })} />
            )}
            <NumberField
              label="Race weight"
              unit="lb"
              step={10}
              min={200}
              max={20000}
              value={state.trapWeightLb}
              onCommit={(trapWeightLb) => set({ trapWeightLb })}
            />
          </div>
          <NumberField
            label="Peak power at"
            unit="rpm"
            step={100}
            min={1500}
            max={20000}
            value={state.trapPeakRpm}
            onCommit={(trapPeakRpm) => set({ trapPeakRpm })}
          />
          <p className="hint">
            {eighth ? `${quarterTrapMph(state).toFixed(1)} mph 1/4 mile equiv. · ` : ""}
            {Math.round(trapHp * (1 - drivetrainLoss))} whp · {Math.round(trapHp)} hp crank
          </p>
        </>
      ) : state.method === "peak" ? (
        <>
          {basisToggle(state.peakBasis, (peakBasis) => set({ peakBasis }))}
          <div className="field-row">
            <NumberField label="Peak power" unit={hpUnit} step={1} min={1} value={state.peak.peakHp} onCommit={(peakHp) => set({ peak: { ...state.peak, peakHp } })} />
            <NumberField
              label="at"
              unit="rpm"
              step={100}
              min={500}
              max={20000}
              value={state.peak.peakHpRpm}
              onCommit={(peakHpRpm) => set({ peak: { ...state.peak, peakHpRpm } })}
            />
          </div>
          <div className="field-row">
            <NumberField
              label="Peak torque"
              unit="lb-ft"
              step={1}
              min={1}
              value={state.peak.peakTorque}
              onCommit={(peakTorque) => set({ peak: { ...state.peak, peakTorque } })}
            />
            <NumberField
              label="at"
              unit="rpm"
              step={100}
              min={500}
              max={20000}
              value={state.peak.peakTorqueRpm}
              onCommit={(peakTorqueRpm) => set({ peak: { ...state.peak, peakTorqueRpm } })}
            />
          </div>
        </>
      ) : (
        <>
          {basisToggle(state.dynoBasis, (dynoBasis) => set({ dynoBasis }))}
          <DynoEditor points={state.dyno} hpUnit={hpUnit} onChange={(dyno) => set({ dyno })} />
        </>
      )}
      {error ? (
        <p className="hint error" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}

/** Torque and power curves for the selected power input, with the peaks. */
export function PowerCurves({ curve, basis }: { curve: PowerCurve | null; basis: PowerBasis }) {
  if (!curve) {
    return (
      <div className="split-results">
        <p className="empty">No power curve.</p>
      </div>
    );
  }
  const peaks = curvePeaks(curve);
  const hpUnit = basis === "wheel" ? "whp" : "hp";
  const formatRpm = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v % 1000 ? 1 : 0)}k` : String(Math.round(v)));
  return (
    <div className="split-results">
      <ul className="legend" aria-label="Curves">
        <li>
          <span className="legend-swatch" style={{ background: TORQUE_COLOR }} />
          Torque <span className="legend-ratio">lb-ft</span>
        </li>
        <li>
          <span className="legend-swatch" style={{ background: HP_COLOR }} />
          Power <span className="legend-ratio">{hpUnit}</span>
        </li>
      </ul>
      <LineChart
        title="Torque and power"
        series={[
          { key: "tq", label: "Torque", unit: "lb-ft", color: TORQUE_COLOR, points: curve.map((p) => ({ x: p.rpm, y: p.torque })) },
          { key: "hp", label: "Power", unit: hpUnit, color: HP_COLOR, points: curve.map((p) => ({ x: p.rpm, y: horsepower(p.torque, p.rpm) })) },
        ]}
        pointLabels={[
          {
            key: "tq",
            x: peaks.tq.rpm,
            y: peaks.tq.value,
            color: TORQUE_COLOR,
            label: `${Math.round(peaks.tq.value)} lb-ft @ ${peaks.tq.rpm.toLocaleString()}`,
          },
          {
            key: "hp",
            x: peaks.hp.rpm,
            y: peaks.hp.value,
            color: HP_COLOR,
            label: `${Math.round(peaks.hp.value)} ${hpUnit} @ ${peaks.hp.rpm.toLocaleString()}`,
          },
        ]}
        xLabel="rpm"
        yLabel=""
        formatX={formatRpm}
        formatY={(v) => String(Math.round(v))}
        height={260}
      />
    </div>
  );
}

function CellInput({ value, label, onCommit }: { value: number; label: string; onCommit: (value: number) => void }) {
  const [draft, setDraft] = useState(String(Math.round(value * 10) / 10));
  useEffect(() => setDraft(String(Math.round(value * 10) / 10)), [value]);
  const commit = () => {
    const parsed = Number.parseFloat(draft);
    if (Number.isFinite(parsed) && parsed > 0) onCommit(parsed);
    else setDraft(String(Math.round(value * 10) / 10));
  };
  return (
    <input
      className="cell-input"
      type="number"
      inputMode="decimal"
      aria-label={label}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => event.key === "Enter" && commit()}
    />
  );
}

function DynoEditor({ points, hpUnit, onChange }: { points: CurvePoint[]; hpUnit: string; onChange: (points: CurvePoint[]) => void }) {
  const [paste, setPaste] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const sorted = [...points].sort((a, b) => a.rpm - b.rpm);
  const update = (index: number, patch: Partial<CurvePoint>) =>
    onChange(sorted.map((point, i) => (i === index ? { ...point, ...patch } : point)));

  const importText = (text: string) => {
    const result = parseDynoText(text);
    if (result.error === null) {
      onChange(result.points);
      setMessage({ kind: "ok", text: result.note });
      setPaste("");
    } else {
      setMessage({ kind: "error", text: result.error });
    }
  };

  return (
    <div className="dyno">
      <div className="table-scroll dyno-table-wrap">
        <table className="data-table dyno-table">
          <thead>
            <tr>
              <th scope="col">RPM</th>
              <th scope="col">Lb-ft</th>
              <th scope="col">{hpUnit === "whp" ? "WHP" : "HP"}</th>
              <th scope="col">
                <span className="visually-hidden">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((point, index) => (
              <tr key={`${point.rpm}-${index}`}>
                <td>
                  <CellInput label={`RPM, row ${index + 1}`} value={point.rpm} onCommit={(rpm) => update(index, { rpm })} />
                </td>
                <td>
                  <CellInput label={`Torque at ${point.rpm} rpm`} value={point.torque} onCommit={(torque) => update(index, { torque })} />
                </td>
                <td>
                  <CellInput
                    label={`HP at ${point.rpm} rpm`}
                    value={horsepower(point.torque, point.rpm)}
                    onCommit={(hp) => update(index, { torque: torqueFromHp(hp, point.rpm) })}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Remove ${point.rpm} rpm row`}
                    disabled={sorted.length <= 3}
                    onClick={() => onChange(sorted.filter((_, i) => i !== index))}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        className="text-button"
        onClick={() => {
          const last = sorted[sorted.length - 1];
          onChange([...sorted, { rpm: (last?.rpm ?? 0) + 500, torque: last?.torque ?? 300 }]);
        }}
      >
        + Add row
      </button>

      <details className="import">
        <summary>Paste or import a dyno CSV</summary>
        <textarea
          aria-label="Dyno data"
          rows={5}
          placeholder={"RPM, Torque, HP\n3000, 375, 214\n4000, 410, 312\n…"}
          value={paste}
          onChange={(event) => setPaste(event.target.value)}
        />
        <div className="import-actions">
          <button type="button" className="button" onClick={() => importText(paste)} disabled={!paste.trim()}>
            Import pasted rows
          </button>
          <label className="button button-ghost">
            Open file…
            <input
              type="file"
              accept=".csv,.txt,.tsv,text/csv,text/plain"
              className="visually-hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) file.text().then(importText);
                event.target.value = "";
              }}
            />
          </label>
        </div>
      </details>
      {message ? (
        <p className={message.kind === "error" ? "hint error" : "hint"} role="status">
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
