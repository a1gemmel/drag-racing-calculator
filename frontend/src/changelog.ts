/**
 * CHANGELOG.md split into version sections. Headings are "## vX.Y.Z — YYYY-MM-DD", optionally followed by
 * " — Title" (same format scripts/version.mjs checks).
 */
export type ChangelogSection = { version: string; date: string | null; title: string | null; body: string };

const HEADING = /^## v(\S+)(?:\s+—\s+(\d{4}-\d{2}-\d{2}))?(?:\s+—\s+(.+?))?\s*$/;

export function parseChangelog(text: string): { intro: string; sections: ChangelogSection[] } {
  const intro: string[] = [];
  const sections: (Omit<ChangelogSection, "body"> & { lines: string[] })[] = [];
  for (const line of text.split(/\r?\n/)) {
    const heading = HEADING.exec(line);
    if (heading) sections.push({ version: heading[1], date: heading[2] ?? null, title: heading[3] ?? null, lines: [] });
    else if (sections.length) sections[sections.length - 1].lines.push(line);
    else if (!/^# /.test(line)) intro.push(line);
  }
  return {
    intro: intro.join("\n").trim(),
    sections: sections.map(({ lines, ...rest }) => ({ ...rest, body: lines.join("\n").trim() })),
  };
}
