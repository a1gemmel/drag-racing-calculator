import type { ReactNode } from "react";

/** A titled block of inputs inside a card, e.g. the automatic's converter settings. */
export function Subgroup({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="subgroup">
      <div className="subgroup-title-row">
        <h3 className="subgroup-title">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}
