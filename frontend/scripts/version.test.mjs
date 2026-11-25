import { describe, expect, it } from "vitest";
import { compareVersions, parseChangelog, versionProblems } from "./version.mjs";

const changelog = (...sections) => ["# Changelog", "", ...sections].join("\n");

describe("versionProblems", () => {
  const good = changelog("## v0.2.0 — 2026-12-01", "", "- Added a thing.", "", "## v0.1.0 — 2026-11-25", "", "- First.");

  it("passes when package.json, lockfile and changelog agree", () => {
    expect(versionProblems({ version: "0.2.0", lockVersion: "0.2.0", changelog: good })).toEqual([]);
  });

  it("requires the newest changelog section to be the current version", () => {
    expect(versionProblems({ version: "0.3.0", lockVersion: "0.3.0", changelog: good }).join(" ")).toMatch(/add a "## v0.3.0" section/);
  });

  it("requires the lockfile to match and versions to be semver", () => {
    expect(versionProblems({ version: "0.2.0", lockVersion: "0.1.0", changelog: good }).join(" ")).toMatch(/package-lock/);
    expect(versionProblems({ version: "0.2", lockVersion: "0.2", changelog: good }).join(" ")).toMatch(/MAJOR.MINOR.PATCH/);
  });

  it("requires a list of changes, unique versions and newest-first order", () => {
    const empty = changelog("## v0.2.0", "", "Nothing listed.", "## v0.1.0", "- First.");
    expect(versionProblems({ version: "0.2.0", lockVersion: "0.2.0", changelog: empty }).join(" ")).toMatch(/lists no changes/);
    const duplicate = changelog("## v0.2.0", "- A.", "## v0.2.0", "- B.");
    expect(versionProblems({ version: "0.2.0", lockVersion: "0.2.0", changelog: duplicate }).join(" ")).toMatch(/twice/);
    const unordered = changelog("## v0.1.1", "- A.", "## v0.2.0", "- B.");
    expect(versionProblems({ version: "0.1.1", lockVersion: "0.1.1", changelog: unordered }).join(" ")).toMatch(/newer than/);
  });
});

describe("helpers", () => {
  it("compares versions numerically", () => {
    expect(compareVersions("0.10.0", "0.9.9")).toBeGreaterThan(0);
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
  });

  it("extracts each section's notes", () => {
    expect(parseChangelog(changelog("## v0.1.0 — date", "", "- First.", ""))).toEqual([{ version: "0.1.0", body: "- First." }]);
  });
});
