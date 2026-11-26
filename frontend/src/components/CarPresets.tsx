import { useEffect, useRef, useState } from "react";
import { CAR_PRESETS, matchingPreset, presetPatch, type CarPreset } from "../carPresets";
import type { VehicleSetup } from "../quarterMile";

export function Silhouette({ preset }: { preset: CarPreset }) {
  return (
    <svg className="preset-silhouette" viewBox="0 0 160 56" aria-hidden="true">
      <path className="preset-body" d={preset.body} />
      {preset.windows ? <path className="preset-glass" d={preset.windows} /> : null}
      {preset.wheels.map((wheel) => {
        const cy = 52 - wheel.r;
        return (
          <g key={wheel.x}>
            <circle className="preset-tire" cx={wheel.x} cy={cy} r={wheel.r} />
            <circle className="preset-rim" cx={wheel.x} cy={cy} r={wheel.r * 0.58} />
            <circle className="preset-hub" cx={wheel.x} cy={cy} r={wheel.r * 0.18} />
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Body presets behind a "Presets" button. The menu floats over the page (absolute), so opening it
 * doesn't move anything. A pick sets only the Advanced fields (weight split, CG height, wheelbase, aero).
 */
export function CarPresets({ vehicle, onApply }: { vehicle: VehicleSetup; onApply: (patch: Partial<VehicleSetup>) => void }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const active = matchingPreset(vehicle);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="preset-menu-wrap" ref={wrap}>
      <button type="button" className="button button-ghost preset-toggle" aria-expanded={open} aria-haspopup="true" aria-label={`Preset: ${active ? active.label : "Custom"}`} onClick={() => setOpen(!open)}>
        <span>{active ? active.label : "Custom"}</span>
        <span aria-hidden="true">▾</span>
      </button>
      {open ? (
        <div className="preset-menu" role="group" aria-label="Body preset">
          {CAR_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={preset.id === active?.id ? "car-preset active" : "car-preset"}
              aria-pressed={preset.id === active?.id}
              onClick={() => {
                onApply(presetPatch(preset, vehicle.drive));
                setOpen(false);
              }}
            >
              <Silhouette preset={preset} />
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
