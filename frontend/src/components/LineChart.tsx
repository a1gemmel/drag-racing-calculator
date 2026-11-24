import { useState } from "react";
import { niceStep } from "./GearChart";

export type Series = { key: string; label: string; color: string; points: { x: number; y: number }[] };

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
  markers?: { x: number; label: string }[];
  height?: number;
};

const WIDTH = 640;
const PAD = { left: 50, right: 14, top: 14, bottom: 30 };
const TOOLTIP_W = 150;

/** Small single-axis line chart with a hover crosshair. Used for power curves and run traces. */
export function LineChart({ title, series, xLabel, yLabel, formatX, formatY, xMax, markers = [], height = 220 }: Props) {
  const [hoverX, setHoverX] = useState<number | null>(null);
  const all = series.flatMap((s) => s.points);
  if (all.length === 0) return null;

  const dataXMax = xMax ?? Math.max(...all.map((p) => p.x));
  const xStep = niceStep(dataXMax, 8);
  const xTop = Math.ceil(dataXMax / xStep) * xStep;
  const yMaxRaw = Math.max(...all.map((p) => p.y), 1);
  const yStep = niceStep(yMaxRaw, 5);
  const yTop = Math.ceil(yMaxRaw / yStep) * yStep;
  const right = WIDTH - PAD.right;
  const bottom = height - PAD.bottom;
  const x = (value: number) => PAD.left + (value / xTop) * (right - PAD.left);
  const y = (value: number) => bottom - (value / yTop) * (bottom - PAD.top);
  const xTicks = Array.from({ length: Math.round(xTop / xStep) + 1 }, (_, i) => i * xStep);
  const yTicks = Array.from({ length: Math.round(yTop / yStep) + 1 }, (_, i) => i * yStep);

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
    <figure className="line-chart">
      <figcaption>{title}</figcaption>
      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        role="img"
        aria-label={title}
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const svgX = ((event.clientX - rect.left) / rect.width) * WIDTH;
          const value = ((svgX - PAD.left) / (right - PAD.left)) * xTop;
          setHoverX(value >= 0 && value <= xTop ? value : null);
        }}
        onMouseLeave={() => setHoverX(null)}
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
        <text className="axis-title" x={right} y={height - 2} textAnchor="end">
          {xLabel}
        </text>
        <text className="axis-title" x={PAD.left - 8} y={PAD.top - 4} textAnchor="end">
          {yLabel}
        </text>

        {markers.map((marker) => (
          <g key={`m${marker.x}`}>
            <line className="marker-line" x1={x(marker.x)} x2={x(marker.x)} y1={PAD.top} y2={bottom} />
            <text className="marker-label" x={x(marker.x) + 4} y={PAD.top + 10}>
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

        {hoverX !== null && readings.length > 0 ? (
          <g pointerEvents="none">
            <line className="crosshair" x1={x(hoverX)} x2={x(hoverX)} y1={PAD.top} y2={bottom} />
            {readings.map(({ series: s, point }) => (
              <circle key={s.key} className="hover-dot" cx={x(point.x)} cy={y(point.y)} r={4} style={{ stroke: s.color }} />
            ))}
            {(() => {
              const boxH = 22 + readings.length * 16;
              const boxX = x(hoverX) + 12 + TOOLTIP_W > right ? x(hoverX) - 12 - TOOLTIP_W : x(hoverX) + 12;
              return (
                <g className="tooltip">
                  <rect x={boxX} y={PAD.top} width={TOOLTIP_W} height={boxH} rx={6} />
                  <text className="tooltip-title" x={boxX + 10} y={PAD.top + 16}>
                    {formatX(readings[0].point.x)} {xLabel}
                  </text>
                  {readings.map(({ series: s, point }, i) => (
                    <g key={s.key}>
                      <circle cx={boxX + 14} cy={PAD.top + 28 + i * 16} r={3.5} style={{ fill: s.color }} />
                      <text className="tooltip-value" x={boxX + 24} y={PAD.top + 32 + i * 16}>
                        {s.label}: {formatY(point.y)} {yLabel}
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
