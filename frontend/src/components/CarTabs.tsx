import { useEffect, useRef, useState, type KeyboardEvent } from "react";

type Props = {
  cars: { name: string; color: string }[];
  active: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onRename: (name: string) => void;
  onColor: (color: string) => void;
  canAdd: boolean;
};

/** Tabs over the setup cards, one per car; [+] adds a copy of the open car. */
export function CarTabs({ cars, active, onSelect, onAdd, onRemove, onRename, onColor, canAdd }: Props) {
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = cars[active];
  const [draft, setDraft] = useState(current?.name ?? "");
  useEffect(() => setDraft(current?.name ?? ""), [current?.name, active]);
  const commit = () => {
    const name = draft.trim();
    if (name && name !== current?.name) onRename(name);
    else setDraft(current?.name ?? "");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + cars.length) % cars.length;
    onSelect(next);
    tabs.current[next]?.focus();
  };

  return (
    <div className="car-tabs">
      <div className="car-tab-row">
        <div className="car-tab-list" role="tablist" aria-label="Cars">
          {cars.map((car, index) => (
            <button
              key={index}
              ref={(element) => {
                tabs.current[index] = element;
              }}
              type="button"
              role="tab"
              aria-selected={index === active}
              tabIndex={index === active ? 0 : -1}
              className={index === active ? "car-tab active" : "car-tab"}
              onClick={() => onSelect(index)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              <span className="legend-swatch" style={{ background: car.color }} />
              {car.name}
            </button>
          ))}
        </div>
        <button type="button" className="car-tab-add" onClick={onAdd} disabled={!canAdd} aria-label="Add a car" title="Add a car">
          +
        </button>
      </div>
      <div className="car-tab-tools">
        <label className="car-name">
          <span className="field-label">Name</span>
          <input
            type="text"
            value={draft}
            maxLength={24}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => event.key === "Enter" && commit()}
          />
        </label>
        <label className="car-color">
          <span className="field-label">Color</span>
          <input type="color" value={current?.color ?? "#3987e5"} onChange={(event) => onColor(event.target.value)} />
        </label>
        {cars.length > 1 ? (
          <button type="button" className="text-button" onClick={() => onRemove(active)}>
            Remove car
          </button>
        ) : null}
      </div>
    </div>
  );
}
