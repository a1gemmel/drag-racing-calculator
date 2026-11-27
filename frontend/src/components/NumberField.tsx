import { useEffect, useId, useState, type ReactNode } from "react";

type Props = {
  label: string;
  unit?: string;
  value: number;
  onCommit: (value: number) => void;
  step?: number;
  /** Smallest accepted value (inclusive). Anything lower, or not a number, reverts to the last good value. */
  min?: number;
  max?: number;
  hint?: string;
  disabled?: boolean;
  /** A small control beside the label, e.g. an "Auto" button. */
  action?: ReactNode;
  /** How the value is shown in the box (default String), e.g. a fixed number of decimals. */
  format?: (value: number) => string;
};

/**
 * Numeric input that edits a local draft and commits on blur or Enter, so typing an
 * intermediate value ("", "0.") never reaches the calculations.
 */
export function NumberField({ label, unit, value, onCommit, step, min = 0, max, hint, disabled, action, format = String }: Props) {
  const id = useId();
  const [draft, setDraft] = useState(format(value));
  // format is usually an inline function, so only a new value resets the draft.
  useEffect(() => setDraft(format(value)), [value]);

  const commit = () => {
    const parsed = Number.parseFloat(draft);
    const valid = Number.isFinite(parsed) && parsed >= min && (max === undefined || parsed <= max);
    if (valid && parsed !== value) onCommit(parsed);
    else setDraft(format(value));
  };

  return (
    <div className="field">
      {action ? (
        <div className="field-label-row">
          <label htmlFor={id}>{label}</label>
          {action}
        </div>
      ) : (
        <label htmlFor={id}>{label}</label>
      )}
      <div className="input-wrap">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          max={max}
          value={draft}
          disabled={disabled}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit();
            if (event.key === "Escape") setDraft(format(value));
          }}
          aria-describedby={hint ? `${id}-hint` : undefined}
        />
        {unit ? <span className="unit">{unit}</span> : null}
      </div>
      {hint ? (
        <p className="hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
