import { useRef } from "react";
import { APP_VERSION, CHANGELOG, COMMIT_URL, SHORT_SHA } from "../buildInfo";

/** Footer with the version ("v0.1.0 abc1234", linking to the commit) and a changelog modal. */
export function SiteFooter() {
  const dialog = useRef<HTMLDialogElement>(null);
  const label = `v${APP_VERSION}${SHORT_SHA ? ` ${SHORT_SHA}` : ""}`;

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
          <pre className="changelog-text">{CHANGELOG}</pre>
        </div>
      </dialog>
    </footer>
  );
}
