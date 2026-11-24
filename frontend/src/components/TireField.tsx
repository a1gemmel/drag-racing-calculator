import { useEffect, useId, useState } from "react";
import { parseTireSize, ROLLING_DIAMETER_FACTOR } from "../tires";
import { NumberField } from "./NumberField";
import { Segmented } from "./Segmented";

export type TireMode = "diameter" | "size";

type Props = {
  mode: TireMode;
  onModeChange: (mode: TireMode) => void;
  diameterIn: number;
  onDiameterChange: (value: number) => void;
  size: string;
  onSizeChange: (value: string) => void;
};

const SHRINK_PERCENT = Math.round((1 - ROLLING_DIAMETER_FACTOR) * 100);

/** Tire input: either a measured diameter in inches, or a size like 275/55R15 / 35x12.50R17. */
export function TireField({ mode, onModeChange, diameterIn, onDiameterChange, size, onSizeChange }: Props) {
  const id = useId();
  const [draft, setDraft] = useState(size);
  const [error, setError] = useState(false);
  useEffect(() => setDraft(size), [size]);

  const parsed = parseTireSize(size);

  const commit = () => {
    if (parseTireSize(draft)) {
      setError(false);
      if (draft !== size) onSizeChange(draft.trim());
    } else {
      setError(draft.trim() !== "");
      if (draft.trim() === "") setDraft(size);
    }
  };

  return (
    <div className="tire-field">
      <Segmented
        label="Tire input"
        size="small"
        value={mode}
        onChange={onModeChange}
        options={[
          { value: "diameter", label: "Diameter" },
          { value: "size", label: "Tire size" },
        ]}
      />
      {mode === "diameter" ? (
        <NumberField
          label="Tire diameter"
          unit="in"
          step={0.1}
          min={10}
          max={60}
          value={diameterIn}
          onCommit={onDiameterChange}
          hint="Measured or effective height. Used as entered."
        />
      ) : (
        <div className="field">
          <label htmlFor={id}>Tire size</label>
          <input
            id={id}
            type="text"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="275/55R15 or 35x12.50R17"
            value={draft}
            aria-invalid={error}
            aria-describedby={`${id}-hint`}
            onChange={(event) => {
              setDraft(event.target.value);
              setError(false);
            }}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") commit();
              if (event.key === "Escape") {
                setDraft(size);
                setError(false);
              }
            }}
          />
          <p className={error ? "hint error" : "hint"} id={`${id}-hint`} role={error ? "alert" : undefined}>
            {error
              ? "Use a size like 275/55R15 or 35x12.50R17."
              : parsed
                ? `${parsed.nominalDiameterIn.toFixed(1)}″ by the numbers → ${parsed.effectiveDiameterIn.toFixed(1)}″ rolling (−${SHRINK_PERCENT}% for sidewall squat and true size).`
                : "Enter a tire size."}
          </p>
        </div>
      )}
    </div>
  );
}
