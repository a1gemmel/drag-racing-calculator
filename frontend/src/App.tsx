const gears = [
  { label: "1st", ratio: 3.27, speed: 34.6 },
  { label: "2nd", ratio: 1.98, speed: 57.2 },
  { label: "3rd", ratio: 1.34, speed: 84.6 },
  { label: "4th", ratio: 1, speed: 113.2 },
  { label: "5th", ratio: 0.72, speed: 157.2 },
];

export function App() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">DRIVETRAIN LAB / 01</p>
          <h1>Transmission Ratio Viz</h1>
        </div>
        <button className="save-button">Save build</button>
      </header>

      <section className="workspace-heading">
        <div>
          <p className="eyebrow">GEARING WORKSPACE</p>
          <h2>See the shape of every shift.</h2>
        </div>
        <p className="intro">
          Model the relationship between engine speed, gearing, and road speed
          before the first test drive.
        </p>
      </section>

      <section className="workspace-grid">
        <aside className="panel controls-panel">
          <div className="panel-title">
            <span>01</span>
            <h3>Configuration</h3>
          </div>
          <label>
            Transmission
            <select defaultValue="tkx-wide">
              <option value="tkx-wide">TKX / wide ratio</option>
              <option value="custom">Custom gearset</option>
            </select>
          </label>
          <div className="field-row">
            <label>
              Tire diameter
              <input defaultValue="26" type="number" />
            </label>
            <label>
              Rear axle
              <input defaultValue="4.10" type="number" step="0.01" />
            </label>
          </div>
          <label>
            Engine redline <strong>6,000 RPM</strong>
            <input defaultValue="6000" type="range" min="3000" max="9000" step="100" />
          </label>
          <div className="transfer-case">
            <div>
              <span className="label-small">AUXILIARY STAGE</span>
              <strong>No transfer case</strong>
            </div>
            <button className="text-button">+ Add stage</button>
          </div>
        </aside>

        <section className="panel chart-panel">
          <div className="panel-title chart-title">
            <div>
              <span>02</span>
              <h3>Road speed at redline</h3>
            </div>
            <span className="unit-chip">MPH</span>
          </div>
          <div className="chart" aria-label="Bar chart of road speed by gear">
            {gears.map((gear) => (
              <div className="bar-group" key={gear.label}>
                <span className="bar-value">{gear.speed.toFixed(0)}</span>
                <div className="bar-track">
                  <div className="bar" style={{ height: `${(gear.speed / 160) * 100}%` }} />
                </div>
                <strong>{gear.label}</strong>
                <span className="ratio">{gear.ratio.toFixed(2)}:1</span>
              </div>
            ))}
          </div>
        </section>
      </section>

      <section className="panel ratio-panel">
        <div className="panel-title">
          <div>
            <span>03</span>
            <h3>Gearset overview</h3>
          </div>
          <button className="text-button">Edit ratios</button>
        </div>
        <div className="ratio-table">
          {gears.map((gear, index) => (
            <div className="ratio-row" key={gear.label}>
              <span>{gear.label}</span>
              <strong>{gear.ratio.toFixed(2)}</strong>
              <span>{index === 0 ? "Starting gear" : `${Math.round((1 - gear.ratio / gears[index - 1].ratio) * 100)}% drop`}</span>
              <span>{gear.speed.toFixed(1)} mph</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}