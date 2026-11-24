import { Fragment } from "react";
import { speedMph, totalRatio } from "../calculations";
import type { Gear } from "./GearChart";
import { NumberField } from "./NumberField";

type Props = {
  gears: Gear[];
  tireDiameter: number;
  axleRatio: number;
  lowRange: number;
  crawlRpm: number;
  onLowRangeChange: (value: number) => void;
  onCrawlRpmChange: (value: number) => void;
};

export function CrawlView({ gears, tireDiameter, axleRatio, lowRange, crawlRpm, onLowRangeChange, onCrawlRpmChange }: Props) {
  const ranges = [
    { name: "High", ratio: 1 },
    { name: "Low", ratio: lowRange },
  ];
  const first = gears[0];
  const crawlRatio = first ? totalRatio(first.ratio, axleRatio, [lowRange]) : 0;
  const crawlSpeed = first ? speedMph(crawlRpm, tireDiameter, first.ratio, axleRatio, [lowRange]) : 0;

  return (
    <>
      <section className="card crawl-hero">
        <div>
          <p className="eyebrow">Crawl ratio · 1st × low range × axle</p>
          <p className="hero-number">
            {crawlRatio.toFixed(1)}
            <span>:1</span>
          </p>
        </div>
        <dl className="hero-facts">
          <div>
            <dt>Wheel speed at {crawlRpm.toLocaleString()} rpm</dt>
            <dd>{crawlSpeed.toFixed(2)} mph</dd>
          </div>
          <div>
            <dt>Feet per minute</dt>
            <dd>{Math.round(crawlSpeed * 88).toLocaleString()} ft/min</dd>
          </div>
        </dl>
        <div className="crawl-inputs">
          <NumberField label="Low range ratio" unit=":1" step={0.01} value={lowRange} min={1} onCommit={onLowRangeChange} />
          <NumberField label="Crawl RPM" unit="rpm" step={50} value={crawlRpm} min={100} onCommit={onCrawlRpmChange} />
        </div>
      </section>

      <section className="card">
        <header className="card-header">
          <div>
            <h2>Gear × range matrix</h2>
            <p className="card-subtitle">Total ratio and wheel speed at {crawlRpm.toLocaleString()} rpm</p>
          </div>
        </header>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Gear</th>
                {ranges.map((range) => (
                  <th scope="col" key={range.name} colSpan={2}>
                    {range.name} ({range.ratio.toFixed(2)})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gears.map((gear) => (
                <tr key={gear.label}>
                  <th scope="row">
                    <span className="legend-swatch" style={{ background: gear.color }} />
                    {gear.label}
                  </th>
                  {ranges.map((range) => (
                    <Fragment key={range.name}>
                      <td className="num strong">
                        {totalRatio(gear.ratio, axleRatio, [range.ratio]).toFixed(1)}:1
                      </td>
                      <td className="num">
                        {speedMph(crawlRpm, tireDiameter, gear.ratio, axleRatio, [range.ratio]).toFixed(1)} mph
                      </td>
                    </Fragment>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
