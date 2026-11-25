import { describe, expect, it } from "vitest";
import { parseChangelog } from "./changelog";

describe("parseChangelog", () => {
  it("splits versions with optional titles and keeps the intro", () => {
    const { intro, sections } = parseChangelog(
      ["# Changelog", "", "Intro text.", "", "## v0.3.0 — 2026-11-25 — UI Overhaul", "", "- A.", "## v0.2.1 — 2026-11-25", "- B."].join("\n"),
    );
    expect(intro).toBe("Intro text.");
    expect(sections).toEqual([
      { version: "0.3.0", date: "2026-11-25", title: "UI Overhaul", body: "- A." },
      { version: "0.2.1", date: "2026-11-25", title: null, body: "- B." },
    ]);
  });
});
