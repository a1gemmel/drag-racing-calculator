import { useEffect, useState } from "react";
import { stateAtTime, type RunResult } from "../quarterMile";
import type { Gear } from "./GearChart";
import { Segmented } from "./Segmented";
import { useMeasuredWidth } from "./useMeasuredWidth";

export type ReplayCar = { name: string; color: string; gears: Gear[]; run: RunResult };

// Drawn in real pixels (measured width): the start line sits START_X in, the finish FINISH_GAP from the right edge.
const START_X = 56;
const FINISH_GAP = 32;
const LANE_H = 30;
const TOP = 26;
const CAR_LENGTH = 26;
const MARKS = [
  { ft: 60, label: "60'" },
  { ft: 330, label: "330'" },
  { ft: 660, label: "1/8" },
  { ft: 1000, label: "1,000'" },
  { ft: 1320, label: "1/4" },
];
const SPEEDS = ["1", "0.5", "0.25"] as const;
type Speed = (typeof SPEEDS)[number];

/** Time after the last finisher for it to drive off the strip. */
const RUN_OUT_S = 1.5;

/**
 * The pass played back on a drag strip, one lane per car, on the timing-slip clock. The parent remounts
 * it (key) whenever a run changes, so any setting change stops and rewinds it.
 */
export function PassReplay({ cars }: { cars: ReplayCar[] }) {
  const [boxRef, WIDTH] = useMeasuredWidth<HTMLDivElement>(1000);
  const FINISH_X = WIDTH - FINISH_GAP;
  // Past 1,320 ft cars keep going and leave the strip on the right (the svg clips them).
  const xAt = (ft: number) => START_X + (Math.max(ft, 0) / 1320) * (FINISH_X - START_X);
  const end = Math.max(...cars.map((car) => car.run.et ?? car.run.samples[car.run.samples.length - 1]?.t ?? 0), 0) + RUN_OUT_S;
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>("1");
  const clock = Math.min(t, end);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const dt = (now - last) / 1000;
      last = now;
      setT((previous) => {
        const next = previous + dt * Number(speed);
        if (next >= end) {
          setPlaying(false);
          return end;
        }
        return next;
      });
      frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [playing, speed, end]);

  const play = () => {
    if (playing) setPlaying(false);
    else {
      if (clock >= end) setT(0);
      setPlaying(true);
    }
  };

  const states = cars.map((car) => stateAtTime(car.run, clock));
  // Win light: the quickest ET, once that car has finished.
  const winnerIndex = cars.reduce((best, car, i) => ((car.run.et ?? Infinity) < (cars[best].run.et ?? Infinity) ? i : best), 0);
  const winnerShown = cars.length > 1 && states[winnerIndex]?.finished;
  const height = TOP + cars.length * LANE_H + 8;

  return (
    <section className="replay" aria-label="Pass replay">
      <div className="replay-controls">
        <button type="button" className="button replay-play" onClick={play} aria-label={playing ? "Pause" : "Play pass"}>
          {playing ? "❚❚ Pause" : clock >= end ? "↺ Replay" : "▶ Play pass"}
        </button>
        <Segmented<Speed>
          label="Playback speed"
          size="small"
          value={speed}
          onChange={setSpeed}
          options={[
            { value: "1", label: "1×" },
            { value: "0.5", label: "½×" },
            { value: "0.25", label: "¼×" },
          ]}
        />
        <input
          className="replay-scrub"
          type="range"
          min={0}
          max={end}
          step={0.01}
          value={clock}
          aria-label="Replay time"
          onChange={(event) => {
            setPlaying(false);
            setT(Number(event.target.value));
          }}
        />
        <span className="replay-clock">{clock.toFixed(2)} s</span>
      </div>

      <div ref={boxRef}>
      <svg className="replay-strip" viewBox={`0 0 ${WIDTH} ${height}`} role="img" aria-label={`Replay at ${clock.toFixed(2)} s`}>
        {cars.map((car, i) => (
          <rect key={`lane${i}`} className="replay-lane" x={START_X - 40} y={TOP + i * LANE_H + 2} width={FINISH_X - START_X + 72} height={LANE_H - 4} rx={4} />
        ))}
        <line className="replay-start" x1={START_X} x2={START_X} y1={TOP - 4} y2={height - 4} />
        {MARKS.map((mark) => (
          <g key={mark.ft}>
            <line className={mark.ft === 1320 ? "replay-finish" : "replay-mark"} x1={xAt(mark.ft)} x2={xAt(mark.ft)} y1={TOP - 4} y2={height - 4} />
            <text className="replay-mark-label" x={xAt(mark.ft)} y={TOP - 10} textAnchor="middle">
              {mark.label}
            </text>
          </g>
        ))}
        {cars.map((car, i) => {
          const front = xAt(states[i].ft);
          const y = TOP + i * LANE_H + LANE_H / 2;
          return (
            <g key={`car${i}`} transform={`translate(${front} ${y})`}>
              {/* Tires first, so the body sits on top of them: big rears, small fronts. */}
              <rect x={-CAR_LENGTH + 2} y={-9} width={8} height={18} rx={2} className="replay-tire" />
              <rect x={-8} y={-8} width={5} height={16} rx={2} className="replay-tire" />
              <path d={`M ${-CAR_LENGTH} -6 H -6 Q 0 -4 0 0 Q 0 4 -6 6 H ${-CAR_LENGTH} Z`} style={{ fill: car.color }} />
            </g>
          );
        })}
      </svg>
      </div>

      <ul className="replay-readouts">
        {cars.map((car, i) => {
          const state = states[i];
          const finished = state.finished && car.run.et !== null;
          return (
            <li key={`readout${i}`}>
              <span className="legend-swatch" style={{ background: car.color }} />
              <span className="replay-name">{car.name}</span>
              {winnerShown && i === winnerIndex ? <span className="replay-win">WIN</span> : null}
              <span className="replay-value">
                {finished
                  ? `${car.run.et!.toFixed(3)} s @ ${(car.run.trapMph ?? state.mph).toFixed(1)} mph`
                  : clock <= 0
                    ? "Staged"
                    : `${Math.round(state.ft)} ft · ${state.mph.toFixed(1)} mph`}
              </span>
              <span className="replay-value muted">
                {car.gears[state.gear]?.label ?? ""} · {Math.round(state.rpm).toLocaleString()} rpm
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
