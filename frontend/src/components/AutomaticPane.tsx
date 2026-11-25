import { launchRpm, type AutomaticSetup, type LaunchMethod, type LockupMode } from "../automatic";
import { NumberField } from "./NumberField";
import { Segmented } from "./Segmented";
import { Subgroup } from "./Subgroup";

type Props = {
  setup: AutomaticSetup;
  defaults: AutomaticSetup;
  onChange: (setup: AutomaticSetup) => void;
};

const same = (a: AutomaticSetup, b: AutomaticSetup) => JSON.stringify(a) === JSON.stringify(b);

/** Torque converter, launch and lock-up settings for the selected automatic transmission. */
export function AutomaticPane({ setup, defaults, onChange }: Props) {
  const set = (patch: Partial<AutomaticSetup>) => onChange({ ...setup, ...patch });

  const changeStall = (stallRpm: number) => {
    // Launch rpms can't exceed stall; a trans-brake rpm that sat at stall follows it.
    const transbrakeRpm = setup.transbrakeRpm === setup.stallRpm ? stallRpm : Math.min(setup.transbrakeRpm, stallRpm);
    set({ stallRpm, transbrakeRpm, footbrakeRpm: Math.min(setup.footbrakeRpm, stallRpm) });
  };

  return (
    <Subgroup
      title="Converter & shifts"
      action={
        !same(setup, defaults) ? (
          <button type="button" className="text-button" onClick={() => onChange(defaults)}>
            Reset
          </button>
        ) : null
      }
    >

      <NumberField label="Converter stall" unit="rpm" step={100} min={1000} max={9000} value={setup.stallRpm} onCommit={changeStall} />

      <div className="field">
        <span className="field-label">Launch</span>
        <Segmented<LaunchMethod>
          label="Launch"
          size="small"
          value={setup.launch}
          onChange={(launch) => set({ launch })}
          options={[
            { value: "transbrake", label: "Trans brake" },
            { value: "footbrake", label: "Foot brake" },
          ]}
        />
      </div>
      {setup.launch === "transbrake" ? (
        <NumberField
          label="Trans brake"
          unit="rpm"
          step={100}
          min={800}
          max={setup.stallRpm}
          value={setup.transbrakeRpm}
          onCommit={(transbrakeRpm) => set({ transbrakeRpm })}
        />
      ) : (
        <NumberField
          label="Foot brake holds"
          unit="rpm"
          step={100}
          min={800}
          max={setup.stallRpm}
          value={setup.footbrakeRpm}
          onCommit={(footbrakeRpm) => set({ footbrakeRpm })}
        />
      )}
      <p className="hint">Launch at {launchRpm(setup).toLocaleString()} rpm</p>

      <div className="field">
        <span className="field-label">Lock-up</span>
        {setup.lockupCapable ? (
          <Segmented<LockupMode>
            label="Lock-up"
            size="small"
            value={setup.lockup}
            onChange={(lockup) => set({ lockup })}
            options={[
              { value: "off", label: "Off" },
              { value: "top", label: "Top gear" },
              { value: "after1st", label: "2nd & up" },
            ]}
          />
        ) : (
          <p className="hint">No lock-up clutch</p>
        )}
      </div>

      <NumberField
        label="Converter slip at WOT"
        unit="%"
        step={0.5}
        min={0.5}
        max={30}
        value={Math.round(setup.couplingSlip * 1000) / 10}
        onCommit={(pct) => set({ couplingSlip: pct / 100 })}
      />

      <details className="advanced">
        <summary>Advanced</summary>
        <div className="advanced-grid">
          <NumberField
            label="Stall torque ratio"
            unit=":1"
            step={0.05}
            min={1}
            max={3.5}
            value={setup.stallTorqueRatio}
            onCommit={(stallTorqueRatio) => set({ stallTorqueRatio })}
          />
          <NumberField label="Shift time" unit="s" step={0.01} min={0} max={1} value={setup.shiftTimeS} onCommit={(shiftTimeS) => set({ shiftTimeS })} />
          <NumberField
            label="Shift loss"
            unit="%"
            step={1}
            min={0}
            max={100}
            value={Math.round(setup.shiftLoss * 100)}
            onCommit={(pct) => set({ shiftLoss: pct / 100 })}
          />
          <NumberField
            label="Drivetrain loss"
            unit="%"
            step={1}
            min={0}
            max={50}
            value={Math.round(setup.drivetrainLoss * 100)}
            onCommit={(pct) => set({ drivetrainLoss: pct / 100 })}
          />
          <div className="field">
            <span className="field-label">Lock-up clutch</span>
            <Segmented
              label="Lock-up clutch"
              size="small"
              value={setup.lockupCapable ? "yes" : "no"}
              onChange={(value) => set({ lockupCapable: value === "yes", lockup: value === "yes" ? setup.lockup : "off" })}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
            />
          </div>
        </div>
      </details>
    </Subgroup>
  );
}
