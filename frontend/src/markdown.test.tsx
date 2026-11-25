import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./markdown";

const html = (text: string) => renderToStaticMarkup(<>{renderMarkdown(text)}</>);

describe("renderMarkdown", () => {
  it("renders headings, paragraphs and bullet lists", () => {
    expect(html("# Changelog\n\nIntro line\ncontinues.\n\n## v0.1.0 — 2026-11-25\n\n- One\n- Two\n  wrapped")).toBe(
      "<h1>Changelog</h1><p>Intro line continues.</p><h2>v0.1.0 — 2026-11-25</h2><ul><li>One</li><li>Two wrapped</li></ul>",
    );
  });

  it("renders links, code and bold inline", () => {
    expect(html("See [semver](https://semver.org), `main` and **bold**.")).toBe(
      '<p>See <a href="https://semver.org" target="_blank" rel="noreferrer">semver</a>, <code>main</code> and <strong>bold</strong>.</p>',
    );
  });

  it("escapes HTML and ignores non-http links", () => {
    expect(html("- <img src=x onerror=alert(1)> [x](javascript:alert(1))")).toBe(
      "<ul><li>&lt;img src=x onerror=alert(1)&gt; [x](javascript:alert(1))</li></ul>",
    );
  });

  it("renders the real changelog without dropping any version", () => {
    const text = __CHANGELOG__;
    const versions = [...text.matchAll(/^## (v\S+)/gm)].map((m) => m[1]);
    const out = html(text);
    for (const version of versions) expect(out).toContain(`<h2>${version}`);
  });
});
