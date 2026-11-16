/** What kind of phone and browser this is: the install guide and the self-check depend on it. */
const realUa = typeof navigator === 'undefined' ? '' : navigator.userAgent;

// Development only: ?as=ios or ?as=line pretends to be iPhone Safari or LINE's browser, to check the install guide
// on a PC. Stripped from the production build.
const pretend = import.meta.env.DEV && typeof location !== 'undefined' ? new URLSearchParams(location.search).get('as') : null;
const ua =
  pretend === 'ios'
    ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1'
    : pretend === 'line'
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/15.0.0'
      : realUa;

export const isIOS =
  /iPhone|iPod|iPad/.test(ua) || (/Macintosh/.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1);

export const isStandalone =
  !pretend &&
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

/** Opened inside LINE's own browser (from a chat link), where "Add to Home Screen" is not available. */
export const inLine = /\bLine\//i.test(ua);

/** Opened inside another app's browser (Instagram, Facebook, X...). */
export const inOtherApp = /FBAN|FBAV|Instagram|Twitter|MicroMessenger/i.test(ua);


/**
 * Recent Safari features, each with the iOS version it arrived in: the only reliable way to tell new iOS versions
 * apart, because the user agent stopped saying (REVIEW 4.7: iOS 26 reports itself as 18.x).
 */
export function featureProbes(): { name: string; since: string; has: boolean }[] {
  const w = window as unknown as Record<string, unknown>;
  return [
    { name: 'audioSession', since: '16.4', has: 'audioSession' in navigator },
    { name: 'cookieStore', since: '18.4', has: 'cookieStore' in w },
    { name: 'URLPattern', since: '26.0', has: 'URLPattern' in w },
    { name: 'navigation', since: '26.2', has: 'navigation' in w },
  ];
}

/** Screen, window and safe-area sizes (layout problems are reported with these). */
export function screenSummary(): string {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  document.body.appendChild(probe);
  const s = getComputedStyle(probe);
  const safe = [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft].map((x) => Math.round(parseFloat(x) || 0));
  probe.remove();
  const vv = window.visualViewport;
  return [
    `screen ${screen.width}x${screen.height} @${devicePixelRatio}x`,
    `window ${innerWidth}x${innerHeight}`,
    vv ? `visual ${Math.round(vv.width)}x${Math.round(vv.height)}` : '',
    `safe ${safe.join('/')}`,
    matchMedia('(orientation: landscape)').matches ? 'landscape' : 'portrait',
    matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduce motion ON' : '',
  ]
    .filter(Boolean)
    .join(', ');
}

export function deviceSummary(): string {
  const os = ua.match(/OS (\d+)_(\d+)/);
  const safari = ua.match(/Version\/(\d+(?:\.\d+)?)/);
  return [
    isIOS ? `iOS ${os ? `${os[1]}.${os[2]}` : '?'}` : 'iPhone以外',
    safari ? `Safari ${safari[1]}` : '',
    `${screen.width}×${screen.height} @${devicePixelRatio}x`,
    isStandalone ? 'ホーム画面から' : 'ブラウザで',
  ]
    .filter(Boolean)
    .join(' / ');
}

/** Shares text through the phone's share sheet (LINE is in it), or copies it if sharing is not possible. 'failed'
 * also covers her cancelling the share sheet: callers then show the text to copy by hand. */
export async function shareText(title: string, text: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (navigator.share) {
      await navigator.share({ title, text });
      return 'shared';
    }
  } catch (e) {
    if ((e as DOMException)?.name === 'AbortError') return 'failed';
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
