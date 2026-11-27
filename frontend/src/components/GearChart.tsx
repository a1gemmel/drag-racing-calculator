import { useMemo, useState } from "react";
import { rpmForSpeed, speedMph } from "../calculations";
import { useMeasuredWidth } from "./useMeasuredWidth";

export type Gear = { label: string; ratio: number; color: string };

type Point = { x: number; y: number };
type Line = Gear & { index: number; start: Point; end: Point };
type Hover = { gear: Line; speed: number; rpm: number } | null;

type Props = {
  gears: Gear[];
  tireDiameter: number;
  axleRatio: number;
  /** Upshift rpm out of each gear (the last entry is the top gear's limit). */
  shiftRpms: number[];
  /**
   * "shifts": each gear runs from where the previous upshift lands up to its shift rpm, with the drops drawn.
   * "full": each gear runs from FULL_RANGE_START_RPM up to its shift rpm. 1st always starts at LAUNCH_RPM.
   */
  view: "shifts" | "full";
};

// Drawn in real pixels (the measured width; height 240-360 px), so text is the same size on every screen.
// Left and bottom leave room for the axis titles.
const chartGeometry = (width: number) => {
  const view = { width, height: Math.round(Math.min(360, Math.max(240, width * 0.5))) };
  return { view, plot: { left: 62, right: width - 20, top: 16, bottom: view.height - 46 } };
};
const TOOLTIP = { width: 150, height: 44 };
/** Where 1st gear's line starts in shift-point mode (roughly idle). */
const LAUNCH_RPM = 600;
/** Where gears after 1st start in full-range view. */
const FULL_RANGE_START_RPM = 1200;
/** Hover snaps to a line's start or end within this many SVG units. */
const SNAP_PX = 14;

// Largest "nice" step (1, 2, 2.5, 5 x 10^n) that splits `max` into at most `maxTicks` intervals.
export function niceStep(max: number, maxTicks: number) {
  const rough = max / maxTicks;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const multiplier = [1, 2, 2.5, 5, 10].find((m) => m * magnitude >= rough) ?? 10;
  return multiplier * magnitude;
}

export function GearChart({ gears, tireDiameter, axleRatio, shiftRpms, view }: Props) {
  const [boxRef, measuredWidth] = useMeasuredWidth<HTMLDivElement>(720);
  const { view: VIEW, plot: PLOT } = chartGeometry(measuredWidth);
  const [hover, setHover] = useState<Hover>(null);
  const shiftKey = shiftRpms.join(",");
  const topRpm = Math.max(...shiftRpms, 1);
  const speedAt = (rpm: number, ratio: number) => speedMph(rpm, tireDiameter, ratio, axleRatio);

  const lines = useMemo<Line[]>(
    () =>
      gears.map((gear, index) => {
        if (view === "full" && index > 0) {
          return {
            ...gear,
            index,
            start: { x: speedAt(FULL_RANGE_START_RPM, gear.ratio), y: FULL_RANGE_START_RPM },
            end: { x: speedAt(shiftRpms[index], gear.ratio), y: shiftRpms[index] },
          };
        }
        // 1st gear pulls away from LAUNCH_RPM; later gears start where the previous upshift lands.
        const startSpeed = index === 0 ? speedAt(LAUNCH_RPM, gear.ratio) : speedAt(shiftRpms[index - 1], gears[index - 1].ratio);
        const startRpm = index === 0 ? LAUNCH_RPM : rpmForSpeed(startSpeed, tireDiameter, gear.ratio, axleRatio);
        return { ...gear, index, start: { x: startSpeed, y: startRpm }, end: { x: speedAt(shiftRpms[index], gear.ratio), y: shiftRpms[index] } };
      }),
    // speedAt only closes over tireDiameter and axleRatio, which are listed.
    // shiftKey stands for shiftRpms, a new array on every render.
    [gears, shiftKey, view, tireDiameter, axleRatio],
  );

  const maxSpeedRaw = Math.max(...lines.map((line) => line.end.x), 1);
  const speedStep = niceStep(maxSpeedRaw, Math.max(3, Math.min(8, Math.floor(measuredWidth / 80))));
  const maxSpeed = Math.ceil(maxSpeedRaw / speedStep) * speedStep;
  const speedTicks = Array.from({ length: Math.round(maxSpeed / speedStep) + 1 }, (_, i) => i * speedStep);
  const rpmCeiling = Math.max(Math.ceil(topRpm / 1000) * 1000, 1000);
  const rpmStep = niceStep(rpmCeiling, 8);
  const rpmTicks = Array.from({ length: Math.floor(rpmCeiling / rpmStep) + 1 }, (_, i) => i * rpmStep);

  const x = (speed: number) => PLOT.left + (speed / maxSpeed) * (PLOT.right - PLOT.left);
  const y = (rpm: number) => PLOT.bottom - (rpm / rpmCeiling) * (PLOT.bottom - PLOT.top);

  const onMove = (line: Line) => (event: React.MouseEvent<SVGPathElement>) => {
    const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!rect) return;
    const svgX = ((event.clientX - rect.left) / rect.width) * VIEW.width;
    const svgY = ((event.clientY - rect.top) / rect.height) * VIEW.height;
    // Project the pointer onto the line; within SNAP_PX of either end, snap to that end.
    const x1 = x(line.start.x);
    const y1 = y(line.start.y);
    const dx = x(line.end.x) - x1;
    const dy = y(line.end.y) - y1;
    const length = Math.hypot(dx, dy);
    let t = length === 0 ? 0 : Math.min(1, Math.max(0, ((svgX - x1) * dx + (svgY - y1) * dy) / (length * length)));
    if (t * length < SNAP_PX) t = 0;
    else if ((1 - t) * length < SNAP_PX) t = 1;
    setHover({
      gear: line,
      speed: line.start.x + (line.end.x - line.start.x) * t,
      rpm: line.start.y + (line.end.y - line.start.y) * t,
    });
  };

  return (
    <div className="chart" ref={boxRef}>
      <ul className="legend" aria-label="Gears">
        {gears.map((gear) => (
          <li key={gear.label}>
            <span className="legend-swatch" style={{ background: gear.color }} />
            {gear.label}
            <span className="legend-ratio">{gear.ratio.toFixed(2)}</span>
          </li>
        ))}
      </ul>

      <svg
        className="chart-svg"
        viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
        role="img"
        aria-label={`Engine RPM versus road speed for ${gears.length} gears`}
        onMouseLeave={() => setHover(null)}
      >
        {rpmTicks.map((rpm) => (
          <g key={`y-${rpm}`}>
            <line className="grid" x1={PLOT.left} x2={PLOT.right} y1={y(rpm)} y2={y(rpm)} />
            <text className="tick" x={PLOT.left - 8} y={y(rpm) + 4} textAnchor="end">
              {rpm === 0 ? "0" : `${rpm / 1000}k`}
            </text>
          </g>
        ))}
        {speedTicks.map((speed) => (
          <text key={`x-${speed}`} className="tick" x={x(speed)} y={PLOT.bottom + 20} textAnchor="middle">
            {speed}
          </text>
        ))}
        <line className="baseline" x1={PLOT.left} x2={PLOT.right} y1={PLOT.bottom} y2={PLOT.bottom} />
        <text className="axis-title" x={(PLOT.left + PLOT.right) / 2} y={VIEW.height - 6} textAnchor="middle">
          mph
        </text>
        <text className="axis-title" transform={`translate(14 ${(PLOT.top + PLOT.bottom) / 2}) rotate(-90)`} textAnchor="middle">
          rpm
        </text>

        {view === "shifts" &&
          lines.slice(1).map((line) => (
            <g key={`drop-${line.label}`}>
              <line className="shift-drop" x1={x(line.start.x)} x2={x(line.start.x)} y1={y(shiftRpms[line.index - 1])} y2={y(line.start.y)} />
              <circle className="shift-dot" cx={x(line.start.x)} cy={y(line.start.y)} r={4} style={{ fill: line.color }} />
            </g>
          ))}

        {lines.map((line) => {
          const d = `M ${x(line.start.x)} ${y(line.start.y)} L ${x(line.end.x)} ${y(line.end.y)}`;
          const dimmed = hover !== null && hover.gear.label !== line.label;
          const labelRight = x(line.end.x) < PLOT.right - 30;
          return (
            <g key={line.label} className={dimmed ? "gear dimmed" : "gear"}>
              <path className="gear-line" d={d} style={{ stroke: line.color }} />
              <text
                className="gear-label"
                x={x(line.end.x) + (labelRight ? 8 : -6)}
                y={y(line.end.y) + (labelRight ? 4 : 16)}
                textAnchor={labelRight ? "start" : "end"}
              >
                {line.label}
              </text>
              <path className="hit" d={d} onMouseMove={onMove(line)} />
            </g>
          );
        })}

        {hover &&
          (() => {
            const cx = x(hover.speed);
            const cy = y(hover.rpm);
            const boxX = cx + 12 + TOOLTIP.width > PLOT.right ? cx - 12 - TOOLTIP.width : cx + 12;
            const boxY = Math.min(Math.max(cy - TOOLTIP.height - 8, PLOT.top), PLOT.bottom - TOOLTIP.height);
            return (
              <g className="tooltip" pointerEvents="none">
                <line className="crosshair" x1={cx} x2={cx} y1={PLOT.top} y2={PLOT.bottom} />
                <circle className="hover-dot" cx={cx} cy={cy} r={5} style={{ stroke: hover.gear.color }} />
                <rect x={boxX} y={boxY} width={TOOLTIP.width} height={TOOLTIP.height} rx={6} />
                <circle cx={boxX + 14} cy={boxY + 16} r={4} style={{ fill: hover.gear.color }} />
                <text className="tooltip-title" x={boxX + 24} y={boxY + 20}>
                  {hover.gear.label} gear · {hover.gear.ratio.toFixed(2)}
                </text>
                <text className="tooltip-value" x={boxX + 10} y={boxY + 36}>
                  {Math.round(hover.rpm).toLocaleString()} rpm · {hover.speed.toFixed(1)} mph
                </text>
              </g>
            );
          })()}
      </svg>
    </div>
  );
}
