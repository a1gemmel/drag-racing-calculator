/**
 * Offline copy of the app. The production build is one self-contained HTML file, so the page can
 * save itself: this module is imported first in main.tsx and captures the document before React
 * renders into #root, giving back the same markup that was served (inline script and styles
 * included). Nothing is fetched, so it also works when the page itself was opened from disk.
 * The current settings are embedded in the copy, so it opens with them as its defaults.
 */

import { embedSettings, SETTINGS_ELEMENT_ID, type AppSettings } from "./appState";

export const OFFLINE_FILE_NAME = "transmission-ratio-viz.html";

/** In dev the page loads /src/main.tsx from the dev server, so a saved copy wouldn't run. */
export const offlineCopyAvailable = !import.meta.env.DEV;

const doctype = document.doctype ? `<!doctype ${document.doctype.name}>\n` : "";
// Captured without any settings from an earlier download; fresh ones are embedded per download.
const pageClone = document.documentElement.cloneNode(true) as HTMLElement;
pageClone.querySelector(`#${SETTINGS_ELEMENT_ID}`)?.remove();
const pageSource = doctype + pageClone.outerHTML;

export function downloadOfflineCopy(settings: AppSettings) {
  const blob = new Blob([embedSettings(pageSource, settings)], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = OFFLINE_FILE_NAME;
  document.body.append(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before releasing the blob.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Size of the saved file in KB, for the button label. */
export const offlineCopyKb = Math.round(new Blob([pageSource]).size / 1024);
