// Version and changelog checks. Usage:
//   node scripts/version.mjs check   - fail unless package.json, package-lock.json and CHANGELOG.md agree
//   node scripts/version.mjs version - print the version (e.g. 0.1.0)
//   node scripts/version.mjs notes   - print the CHANGELOG.md section for the current version
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export function compareVersions(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

/** Version sections of a changelog, newest first as written: [{ version, body }]. */
export function parseChangelog(text) {
  const sections = [];
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    const heading = /^## v(\S+)/.exec(line);
    if (heading) {
      current = { version: heading[1], body: [] };
      sections.push(current);
    } else if (current) {
      current.body.push(line);
    }
  }
  return sections.map(({ version, body }) => ({ version, body: body.join("\n").trim() }));
}

/** Problems with the version setup; empty when everything agrees. */
export function versionProblems({ version, lockVersion, changelog }) {
  const problems = [];
  if (!SEMVER.test(version)) problems.push(`package.json version "${version}" is not MAJOR.MINOR.PATCH`);
  if (lockVersion !== version) problems.push(`package-lock.json version "${lockVersion}" doesn't match package.json "${version}"`);

  const sections = parseChangelog(changelog);
  if (sections.length === 0) {
    problems.push("CHANGELOG.md has no version sections (## vX.Y.Z)");
    return problems;
  }
  if (sections[0].version !== version) {
    problems.push(`CHANGELOG.md's newest section is v${sections[0].version}; add a "## v${version}" section at the top`);
  }
  if (!/^\s*- /m.test(sections[0].body)) problems.push(`CHANGELOG.md section v${sections[0].version} lists no changes ("- ..." lines)`);

  const seen = new Set();
  for (const [i, section] of sections.entries()) {
    if (!SEMVER.test(section.version)) problems.push(`CHANGELOG.md heading v${section.version} is not a valid version`);
    if (seen.has(section.version)) problems.push(`CHANGELOG.md lists v${section.version} twice`);
    seen.add(section.version);
    const older = sections[i + 1];
    if (older && SEMVER.test(section.version) && SEMVER.test(older.version) && compareVersions(section.version, older.version) <= 0) {
      problems.push(`CHANGELOG.md v${section.version} should be newer than the section below it (v${older.version})`);
    }
  }
  return problems;
}

function readInputs() {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
  const changelog = readFileSync(new URL("../../CHANGELOG.md", import.meta.url), "utf8");
  return { version: pkg.version, lockVersion: lock.version, changelog };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const inputs = readInputs();
  const command = process.argv[2] ?? "check";
  if (command === "version") {
    console.log(inputs.version);
  } else if (command === "notes") {
    const section = parseChangelog(inputs.changelog).find((s) => s.version === inputs.version);
    if (!section) {
      console.error(`No CHANGELOG.md section for v${inputs.version}`);
      process.exit(1);
    }
    console.log(section.body);
  } else {
    const problems = versionProblems(inputs);
    if (problems.length) {
      console.error(problems.map((p) => `version check failed: ${p}`).join("\n"));
      process.exit(1);
    }
    console.log(`version check passed: v${inputs.version}`);
  }
}
