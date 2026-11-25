import { useEffect, useRef, useState } from "react";
import { GENERIC_AUTOMATIC } from "../automatic";
import type { TransmissionKind } from "../catalog";
import { customProblems, MAX_GEARS, type CustomTransmission } from "../customTransmissions";
import { NumberField } from "./NumberField";
import { Segmented } from "./Segmented";

const ORDINALS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"];

type Props = {
  /** The transmission to edit (or the starting point for a new one); null closes the dialog. */
  draft: CustomTransmission | null;
  /** Name of the custom being edited, or null when creating. */
  editingName: string | null;
  /** Model names already in use, excluding the one being edited. */
  takenNames: string[];
  onSave: (custom: CustomTransmission, previousName: string | null) => void;
  onDelete: (name: string) => void;
  onClose: () => void;
};

/** Gear count changes keep existing ratios; new gears continue the last step. */
function resize(ratios: number[], count: number): number[] {
  const next = ratios.slice(0, count);
  while (next.length < count) {
    const last = next[next.length - 1] ?? 3;
    const prev = next[next.length - 2];
    const step = prev ? last / prev : 0.7;
    next.push(Math.max(Math.round(last * step * 100) / 100, 0.3));
  }
  return next;
}

export function CustomTransmissionDialog({ draft, editingName, takenNames, onSave, onDelete, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState<CustomTransmission | null>(draft);
  const [showProblems, setShowProblems] = useState(false);

  useEffect(() => {
    setForm(draft);
    setShowProblems(false);
    if (draft && !dialog.current?.open) dialog.current?.showModal();
    if (!draft && dialog.current?.open) dialog.current.close();
  }, [draft]);

  const problems = form ? customProblems(form, takenNames) : [];
  const save = () => {
    if (!form) return;
    if (problems.length) {
      setShowProblems(true);
      return;
    }
    onSave({ ...form, name: form.name.trim() }, editingName);
  };

  return (
    <dialog
      ref={dialog}
      className="changelog-dialog custom-dialog"
      aria-label={editingName ? "Edit custom transmission" : "New custom transmission"}
      onClose={onClose}
      onClick={(event) => event.target === event.currentTarget && dialog.current?.close()}
    >
      {form ? (
        <div className="changelog-content">
          <header className="changelog-header">
            <h2>{editingName ? "Edit custom transmission" : "New custom transmission"}</h2>
            <button type="button" className="icon-button" aria-label="Close" onClick={() => dialog.current?.close()}>
              ×
            </button>
          </header>
          <div className="custom-body">
            <div className="field">
              <label htmlFor="custom-name">Name</label>
              <input
                id="custom-name"
                type="text"
                autoComplete="off"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                onKeyDown={(event) => event.key === "Enter" && save()}
              />
            </div>
            <div className="field-row">
              <div className="field">
                <span className="field-label">Type</span>
                <Segmented<TransmissionKind>
                  label="Type"
                  size="small"
                  value={form.kind}
                  onChange={(kind) =>
                    setForm({ ...form, kind, automatic: kind === "automatic" ? (form.automatic ?? GENERIC_AUTOMATIC) : form.automatic })
                  }
                  options={[
                    { value: "manual", label: "Manual" },
                    { value: "automatic", label: "Automatic" },
                  ]}
                />
              </div>
              <NumberField
                label="Gears"
                step={1}
                min={1}
                max={MAX_GEARS}
                value={form.ratios.length}
                onCommit={(count) => setForm({ ...form, ratios: resize(form.ratios, Math.round(count)) })}
              />
            </div>
            <div className="custom-ratios">
              {form.ratios.map((ratio, index) => (
                <NumberField
                  key={`${index}-${form.ratios.length}`}
                  label={ORDINALS[index] ?? `${index + 1}`}
                  unit=":1"
                  step={0.01}
                  min={0.01}
                  max={20}
                  value={ratio}
                  onCommit={(value) => setForm({ ...form, ratios: form.ratios.map((r, i) => (i === index ? value : r)) })}
                />
              ))}
            </div>
            {showProblems && problems.length ? (
              <ul className="warnings" role="alert">
                {problems.map((problem) => (
                  <li key={problem}>
                    <span aria-hidden="true">!</span> {problem}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="import-actions custom-actions">
              <button type="button" className="button" onClick={save}>
                Save
              </button>
              <button type="button" className="button button-ghost" onClick={() => dialog.current?.close()}>
                Cancel
              </button>
              {editingName ? (
                <button type="button" className="button button-ghost button-danger" onClick={() => onDelete(editingName)}>
                  Delete
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
