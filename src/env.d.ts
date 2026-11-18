/// <reference types="vite/client" />

/** The package version, shown in settings and in reports next to the build's content version (app.build). */
declare const __APP_VERSION__: string;
/** When the app itself last changed (ISO 8601, from git: vite.config.ts), shown in 設定 as 最終更新; '' if unknown. */
declare const __APP_DATE__: string;

interface Window {
  /** Set once the app has started (main.ts); the start-up panel in index.html checks it. */
  __booted?: boolean;
  /** Shows the start-up panel with what went wrong (defined inline in index.html). */
  __bootFailed?: (detail: string) => void;
}
