import { useMemo, useRef } from "react";
import { APP_VERSION, CHANGELOG, COMMIT_URL, SHORT_SHA } from "../buildInfo";
import { parseChangelog } from "../changelog";
import { renderMarkdown } from "../markdown";

/** Footer with the version ("v0.1.0 abc1234", linking to the commit) and a changelog modal. */
export function SiteFooter() {
  const dialog = useRef<HTMLDialogElement>(null);
  const parsed = useMemo(() => parseChangelog(CHANGELOG), []);
  // The newest titled update at or before this version (sections are newest first), so a patch keeps its release's name.
  const currentIndex = parsed.sections.findIndex((section) => section.version === APP_VERSION);
  const currentTitle = parsed.sections.slice(Math.max(currentIndex, 0)).find((section) => section.title)?.title;
  const label = `v${APP_VERSION}${SHORT_SHA ? ` ${SHORT_SHA}` : ""}`;
  // Versions only: the file's heading and intro (about semver) are for the repo, not the page.
  const changelog = useMemo(
    () => (
      <>
        {parsed.sections.map((section) => (
          <section key={section.version} className="changelog-version">
            <h3>
              v{section.version}
              {section.title ? <span className="changelog-title">{section.title}</span> : null}
            </h3>
            {section.date ? <p className="changelog-date">{section.date}</p> : null}
            {renderMarkdown(section.body)}
          </section>
        ))}
      </>
    ),
    [parsed],
  );

  return (
    <footer className="site-footer">
      {COMMIT_URL ? (
        <a className="version-link" href={COMMIT_URL} target="_blank" rel="noreferrer">
          {label}
        </a>
      ) : (
        <span className="version-link">{label}</span>
      )}
      {currentTitle ? <span className="version-title">{currentTitle}</span> : null}
      <button type="button" className="text-button" onClick={() => dialog.current?.showModal()}>
        Changelog
      </button>
      <span className="attribution">© 2026 Andrew Gemmel</span>

      <dialog
        ref={dialog}
        className="changelog-dialog"
        aria-label="Changelog"
        // Clicking the backdrop (the dialog element itself, outside its content) closes it.
        onClick={(event) => event.target === event.currentTarget && dialog.current?.close()}
      >
        <div className="changelog-content">
          <header className="changelog-header">
            <h2>Changelog</h2>
            <button type="button" className="icon-button" aria-label="Close changelog" onClick={() => dialog.current?.close()}>
              ×
            </button>
          </header>
          <div className="changelog-body">{changelog}</div>
        </div>
      </dialog>
    </footer>
  );
}
