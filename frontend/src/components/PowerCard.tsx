import { useEffect, useState } from "react";
import {
  curvePeaks,
  horsepower,
  hpFromTrap,
  parseDynoText,
  torqueFromHp,
  type CurvePoint,
  type PowerBasis,
  type PowerCurve,
  type PowerMethod,
  type PowerState,
} from "../power";
import { LineChart } from "./LineChart";
import { NumberField } from "./NumberField";
import { Segmented } from "./Segmented";

type Props = {
  state: PowerState;
  onChange: (state: PowerState) => void;
  curve: PowerCurve | null;
  error: string | null;
  basis: PowerBasis;
  /** Fraction lost between crank and wheels, for showing the trap estimate at the wheels. */
  drivetrainLoss: number;
};

const TORQUE_COLOR = "#3987e5";
const HP_COLOR = "#d95926";

export function PowerCard({ state, onChange, curve, error, basis, drivetrainLoss }: Props) {
  const set = (patch: Partial<PowerState>) => onChange({ ...state, ...patch });
  const peaks = curve ? curvePeaks(curve) : null;
  const hpUnit = basis === "wheel" ? "whp" : "hp";
  const basisToggle = (value: PowerBasis, onBasis: (basis: PowerBasis) => void) => (
    <div className="field">
      <span className="field-label">Measured at</span>
      <Segmented<PowerBasis>
        label="Measured at"
        size="small"
        value={value}
        onChange={onBasis}
        options={[
          { value: "crank", label: "Crank (engine dyno)" },
          { value: "wheel", label: "Wheel (chassis dyno)" },
        ]}
      />
    </div>
  );

  return (
    <section className="card">
      <header className="card-header">
        <div>
          <h2>Power</h2>
          <p className="card-subtitle">{basis === "wheel" ? "Wheel" : "Crank"}</p>
        </div>
        <Segmented<PowerMethod>
          label="Power input method"
          size="small"
          value={state.method}
          onChange={(method) => set({ method })}
          options={[
            { value: "trap", label: "Trap speed" },
            { value: "peak", label: "Peak numbers" },
            { value: "dyno", label: "Dyno table" },
          ]}
        />
      </header>

      <div className="split">
        <div className="split-inputs">
          {state.method === "trap" ? (
            <>
              <p className="hint">Use a known pass to estimate wheel horsepower</p>
              <div className="field-row">
                <NumberField label="Trap speed" unit="mph" step={0.1} min={20} max={300} value={state.trapMph} onCommit={(trapMph) => set({ trapMph })} />
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
                {Math.round(hpFromTrap(state.trapWeightLb, state.trapMph) * (1 - drivetrainLoss))} whp ·{" "}
                {Math.round(hpFromTrap(state.trapWeightLb, state.trapMph))} hp crank
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
        </div>

        <div className="split-results">
          {curve && peaks ? (
            <>
              <dl className="peak-facts">
                <div>
                  <dt>Peak power</dt>
                  <dd>
                    {Math.round(peaks.hp.value)} {hpUnit} <span>@ {peaks.hp.rpm.toLocaleString()}</span>
                  </dd>
                </div>
                <div>
                  <dt>Peak torque</dt>
                  <dd>
                    {Math.round(peaks.tq.value)} lb-ft <span>@ {peaks.tq.rpm.toLocaleString()}</span>
                  </dd>
                </div>
              </dl>
              <div className="multiples">
                <LineChart
                  title="Torque"
                  series={[{ key: "tq", label: "Torque", color: TORQUE_COLOR, points: curve.map((p) => ({ x: p.rpm, y: p.torque })) }]}
                  xLabel="rpm"
                  yLabel="lb-ft"
                  formatX={(v) => (v >= 1000 ? `${(v / 1000).toFixed(v % 1000 ? 1 : 0)}k` : String(Math.round(v)))}
                  formatY={(v) => String(Math.round(v))}
                  height={200}
                />
                <LineChart
                  title="Power"
                  series={[{ key: "hp", label: "Power", color: HP_COLOR, points: curve.map((p) => ({ x: p.rpm, y: horsepower(p.torque, p.rpm) })) }]}
                  xLabel="rpm"
                  yLabel={hpUnit}
                  formatX={(v) => (v >= 1000 ? `${(v / 1000).toFixed(v % 1000 ? 1 : 0)}k` : String(Math.round(v)))}
                  formatY={(v) => String(Math.round(v))}
                  height={200}
                />
              </div>
            </>
          ) : (
            <p className="empty">No power curve.</p>
          )}
        </div>
      </div>
    </section>
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
              <th scope="col">Torque (lb-ft)</th>
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
