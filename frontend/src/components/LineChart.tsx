import { useState } from "react";
import { niceStep } from "./GearChart";
import { useMeasuredWidth } from "./useMeasuredWidth";

/** `ft` and `t` are optional extra data carried to the tooltip (distance into a run). */
export type ChartPoint = { x: number; y: number; ft?: number; t?: number };
export type Series = {
  key: string;
  label: string;
  color: string;
  points: ChartPoint[];
  /** Tooltip unit; defaults to yLabel. */
  unit?: string;
  /** With `endLabels`: text at the line's end (defaults to label; "" for none, e.g. all but a car's last gear segment). */
  endLabel?: string;
};
/** A marked point (e.g. a car crossing the 1/8 or 1/4) with its own hover text. */
export type ChartDot = { key: string; x: number; y: number; color: string; label: string };
/** A labelled point on the chart, e.g. a peak. */
export type PointLabel = { key: string; x: number; y: number; label: string; color: string };

type Props = {
  title: string;
  series: Series[];
  xLabel: string;
  yLabel: string;
  formatX: (x: number) => string;
  formatY: (y: number) => string;
  /** Fixed x range; defaults to the data's max. */
  xMax?: number;
  /** Vertical reference lines, e.g. shift points. */
  markers?: { x: number; label: string; kind?: "event" | "distance" }[];
  height?: number;
  /** Custom one-line tooltip text per series reading; replaces the default title + "label: value" lines. */
  formatReading?: (series: Series, point: ChartPoint) => string;
  pointLabels?: PointLabel[];
  /** Label each series at the end of its line (series names, e.g. compared cars). */
  endLabels?: boolean;
  dots?: ChartDot[];
  /** Horizontal reference lines, e.g. the 1/8 and 1/4 on a distance axis. */
  hMarkers?: { y: number; label: string }[];
  /** Fixed tick values (e.g. the drag-strip timing marks); default: evenly spaced "nice" steps. */
  xTicks?: number[];
  yTicks?: number[];
  /** Fixed y range top; defaults to a nice step above the data. */
  yMax?: number;
};

const DOT_HIT = 12; // svg units

// Drawn in real pixels (the svg's measured width), so text is the same size on every screen.
// Left and bottom leave room for the axis titles: rotated beside the y ticks, centred under the x ticks.
const PAD = { left: 62, right: 14, top: 14, bottom: 46 };
const TOOLTIP_MIN_W = 150;
const TOOLTIP_CHAR_W = 6.6; // approx. width of an 11px monospace character

/** Small single-axis line chart with a hover crosshair. Used for power curves and run traces. */
export function LineChart({ title, series, xLabel, yLabel, formatX, formatY, xMax, markers = [], height = 220, formatReading, pointLabels = [], endLabels = false, dots = [], hMarkers = [], xTicks: fixedXTicks, yTicks: fixedYTicks, yMax }: Props) {
  const [figureRef, WIDTH] = useMeasuredWidth<HTMLElement>(640);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [hoverDot, setHoverDot] = useState<ChartDot | null>(null);
  const all = series.flatMap((s) => s.points);
  if (all.length === 0) return null;

  const dataXMax = xMax ?? Math.max(...all.map((p) => p.x));
  const xStep = niceStep(dataXMax, Math.max(3, Math.min(8, Math.floor(WIDTH / 90))));
  const xTop = fixedXTicks ? (xMax ?? Math.max(...fixedXTicks)) : Math.ceil(dataXMax / xStep) * xStep;
  // Headroom for point labels drawn above their points.
  const yMaxRaw = Math.max(...all.map((p) => p.y), 1) * (pointLabels.length ? 1 + 0.1 * (pointLabels.length + 1) : 1);
  const yStep = niceStep(yMaxRaw, 5);
  const yTop = yMax ?? (fixedYTicks ? Math.max(...fixedYTicks) : Math.ceil(yMaxRaw / yStep) * yStep);
  // Room on the right for end labels.
  const endText = (s: Series) => s.endLabel ?? s.label;
  const endLabelWidth = endLabels ? Math.max(...series.map((s) => endText(s).length)) * TOOLTIP_CHAR_W + 14 : 0;
  const right = WIDTH - PAD.right - endLabelWidth;
  const bottom = height - PAD.bottom;
  const x = (value: number) => PAD.left + (value / xTop) * (right - PAD.left);
  const y = (value: number) => bottom - (value / yTop) * (bottom - PAD.top);
  const xTicks = fixedXTicks ?? Array.from({ length: Math.round(xTop / xStep) + 1 }, (_, i) => i * xStep);
  const yTicks = fixedYTicks ?? Array.from({ length: Math.round(yTop / yStep) + 1 }, (_, i) => i * yStep);

  // Value of each series at the hovered x (nearest sample), skipping series that don't span it.
  const readings =
    hoverX === null
      ? []
      : series.flatMap((s) => {
          const first = s.points[0];
          const last = s.points[s.points.length - 1];
          if (!first || hoverX < first.x || hoverX > last.x) return [];
          const nearest = s.points.reduce((best, p) => (Math.abs(p.x - hoverX) < Math.abs(best.x - hoverX) ? p : best));
          return [{ series: s, point: nearest }];
        });

  return (
    <figure className="line-chart" ref={figureRef}>
      <figcaption>{title}</figcaption>
      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        role="img"
        aria-label={title}
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const svgX = ((event.clientX - rect.left) / rect.width) * WIDTH;
          const svgY = ((event.clientY - rect.top) / rect.height) * height;
          const value = ((svgX - PAD.left) / (right - PAD.left)) * xTop;
          setHoverX(value >= 0 && value <= xTop ? value : null);
          const near = dots
            .map((dot) => ({ dot, d: Math.hypot(x(dot.x) - svgX, y(dot.y) - svgY) }))
            .filter((hit) => hit.d <= DOT_HIT)
            .sort((a, b) => a.d - b.d)[0];
          setHoverDot(near ? near.dot : null);
        }}
        onMouseLeave={() => {
          setHoverX(null);
          setHoverDot(null);
        }}
      >
        {yTicks.map((tick) => (
          <g key={`y${tick}`}>
            <line className="grid" x1={PAD.left} x2={right} y1={y(tick)} y2={y(tick)} />
            <text className="tick" x={PAD.left - 8} y={y(tick) + 4} textAnchor="end">
              {formatY(tick)}
            </text>
          </g>
        ))}
        {xTicks.map((tick) => (
          <text key={`x${tick}`} className="tick" x={x(tick)} y={bottom + 18} textAnchor="middle">
            {formatX(tick)}
          </text>
        ))}
        <line className="baseline" x1={PAD.left} x2={right} y1={bottom} y2={bottom} />
        <text className="axis-title" x={(PAD.left + right) / 2} y={height - 6} textAnchor="middle">
          {xLabel}
        </text>
        <text className="axis-title" transform={`translate(14 ${(PAD.top + bottom) / 2}) rotate(-90)`} textAnchor="middle">
          {yLabel}
        </text>

        {markers.map((marker) => (
          <g key={`m${marker.kind ?? "event"}${marker.x}`}>
            <line className={marker.kind === "distance" ? "marker-line distance" : "marker-line"} x1={x(marker.x)} x2={x(marker.x)} y1={PAD.top} y2={bottom} />
            {/* Distance marks label at the bottom so they don't collide with shift labels at the top. */}
            <text
              className="marker-label"
              x={x(marker.x) > right - 30 ? x(marker.x) - 4 : x(marker.x) + 4}
              y={marker.kind === "distance" ? bottom - 6 : PAD.top + 10}
              textAnchor={x(marker.x) > right - 30 ? "end" : "start"}
            >
              {marker.label}
            </text>
          </g>
        ))}

        {hMarkers.map((marker) => (
          <g key={`h${marker.y}`}>
            <line className="marker-line distance" x1={PAD.left} x2={right} y1={y(marker.y)} y2={y(marker.y)} />
            <text className="marker-label" x={PAD.left + 6} y={y(marker.y) - 5}>
              {marker.label}
            </text>
          </g>
        ))}

        {series.map((s) => (
          <polyline
            key={s.key}
            className="series-line"
            points={s.points.map((p) => `${x(p.x).toFixed(1)},${y(p.y).toFixed(1)}`).join(" ")}
            style={{ stroke: s.color }}
          />
        ))}

        {endLabels
          ? (() => {
              // At each line's last point, nudged apart vertically so they don't overlap.
              const ends = series
                .flatMap((s) => {
                  const last = s.points[s.points.length - 1];
                  return last && endText(s) ? [{ s, px: x(last.x), py: y(last.y), labelY: y(last.y) }] : [];
                })
                .sort((a, b) => a.py - b.py);
              for (let i = 1; i < ends.length; i++) ends[i].labelY = Math.max(ends[i].labelY, ends[i - 1].labelY + 13);
              return ends.map(({ s, px, py, labelY }) => (
                <g key={`end-${s.key}`} className="end-label">
                  <circle cx={px} cy={py} r={3} style={{ fill: s.color }} />
                  <text x={right + 8} y={labelY + 4}>
                    {endText(s)}
                  </text>
                </g>
              ));
            })()
          : null}

        {/* Point labels sit in rows along the top, with a dashed leader down to the point. */}
        {(() => {
          const rows: { from: number; to: number }[][] = [];
          return pointLabels.map((p) => {
            const px = x(p.x);
            const width = p.label.length * TOOLTIP_CHAR_W;
            const anchor = px > right - width / 2 ? "end" : px < PAD.left + width / 2 ? "start" : "middle";
            const from = anchor === "end" ? px - width : anchor === "start" ? px : px - width / 2;
            let row = rows.findIndex((taken) => taken.every((span) => from > span.to + 12 || from + width < span.from - 12));
            if (row === -1) row = rows.push([]) - 1;
            rows[row].push({ from, to: from + width });
            const labelY = PAD.top + 10 + row * 16;
            return (
              <g key={p.key} className="point-label">
                <line className="point-leader" x1={px} x2={px} y1={labelY + 5} y2={y(p.y) - 6} style={{ stroke: p.color }} />
                <circle cx={px} cy={y(p.y)} r={4} style={{ fill: p.color }} />
                <text x={px} y={labelY} textAnchor={anchor}>
                  {p.label}
                </text>
              </g>
            );
          });
        })()}

        {dots.map((dot) => (
          <circle key={`dot-${dot.key}`} className="chart-dot" cx={x(dot.x)} cy={y(dot.y)} r={hoverDot?.key === dot.key ? 6 : 4.5} style={{ fill: dot.color }} />
        ))}

        {hoverDot
          ? (() => {
              const boxW = Math.max(TOOLTIP_MIN_W, 20 + hoverDot.label.length * TOOLTIP_CHAR_W);
              const px = x(hoverDot.x);
              const py = y(hoverDot.y);
              const boxX = px + 12 + boxW > right ? px - 12 - boxW : px + 12;
              const boxY = Math.max(PAD.top, Math.min(py - 30, bottom - 28));
              return (
                <g className="tooltip" pointerEvents="none">
                  <rect x={boxX} y={boxY} width={boxW} height={24} rx={6} />
                  <text className="tooltip-value" x={boxX + 10} y={boxY + 16}>
                    {hoverDot.label}
                  </text>
                </g>
              );
            })()
          : null}

        {hoverX !== null && readings.length > 0 && !hoverDot ? (
          <g pointerEvents="none">
            <line className="crosshair" x1={x(hoverX)} x2={x(hoverX)} y1={PAD.top} y2={bottom} />
            {readings.map(({ series: s, point }) => (
              <circle key={s.key} className="hover-dot" cx={x(point.x)} cy={y(point.y)} r={4} style={{ stroke: s.color }} />
            ))}
            {(() => {
              const lines = readings.map(({ series: s, point }) =>
                formatReading ? formatReading(s, point) : `${s.label}: ${formatY(point.y)} ${s.unit ?? yLabel}`,
              );
              const title = formatReading ? null : `${formatX(readings[0].point.x)} ${xLabel}`;
              const longest = Math.max(...lines.map((line) => line.length), title?.length ?? 0);
              const boxW = Math.max(TOOLTIP_MIN_W, 34 + longest * TOOLTIP_CHAR_W);
              const top = title ? 22 : 6;
              const boxH = top + readings.length * 16 + 6;
              const boxX = x(hoverX) + 12 + boxW > right ? x(hoverX) - 12 - boxW : x(hoverX) + 12;
              return (
                <g className="tooltip">
                  <rect x={boxX} y={PAD.top} width={boxW} height={boxH} rx={6} />
                  {title ? (
                    <text className="tooltip-title" x={boxX + 10} y={PAD.top + 16}>
                      {title}
                    </text>
                  ) : null}
                  {readings.map(({ series: s }, i) => (
                    <g key={s.key}>
                      <circle cx={boxX + 14} cy={PAD.top + top + 6 + i * 16} r={3.5} style={{ fill: s.color }} />
                      <text className="tooltip-value" x={boxX + 24} y={PAD.top + top + 10 + i * 16}>
                        {lines[i]}
                      </text>
                    </g>
                  ))}
                </g>
              );
            })()}
          </g>
        ) : null}
      </svg>
    </figure>
  );
}
