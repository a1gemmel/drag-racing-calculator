import { useMemo, useRef } from "react";
import { APP_VERSION, CHANGELOG, COMMIT_URL, SHORT_SHA } from "../buildInfo";
import { renderMarkdown } from "../markdown";

/** Footer with the version ("v0.1.0 abc1234", linking to the commit) and a changelog modal. */
export function SiteFooter() {
  const dialog = useRef<HTMLDialogElement>(null);
  const label = `v${APP_VERSION}${SHORT_SHA ? ` ${SHORT_SHA}` : ""}`;
  // The modal has its own "Changelog" title, so drop the file's top-level heading.
  const changelog = useMemo(() => renderMarkdown(CHANGELOG.replace(/^# .*\r?\n/, "")), []);

  return (
    <footer className="site-footer">
      {COMMIT_URL ? (
        <a className="version-link" href={COMMIT_URL} target="_blank" rel="noreferrer">
          {label}
        </a>
      ) : (
        <span className="version-link">{label}</span>
      )}
      <button type="button" className="text-button" onClick={() => dialog.current?.showModal()}>
        Changelog
      </button>

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
