/**
 * Per-browser preference for skipping the session expiry warning.
 * When enabled, the session monitor silently refreshes the JWT
 * instead of prompting the user.
 */

const KEEP_SESSION_KEY = "fr_keep_session";

export function isKeepSessionEnabled(): boolean {
  try {
    return localStorage.getItem(KEEP_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function setKeepSession(enabled: boolean): void {
  try {
    if (enabled) {
      localStorage.setItem(KEEP_SESSION_KEY, "1");
    } else {
      localStorage.removeItem(KEEP_SESSION_KEY);
    }
  } catch {
    // localStorage blocked — silently ignore
  }
}
