import { useId, type ReactNode } from "react";

/** A small "i" that shows a note on hover or keyboard focus. */
export function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <span className="info-tip">
      <button type="button" className="info-tip-button" aria-label={label} aria-describedby={id}>
        i
      </button>
      <span role="tooltip" id={id} className="info-tip-text">
        {children}
      </span>
    </span>
  );
}
