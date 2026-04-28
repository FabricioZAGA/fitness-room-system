/**
 * Monitors the JWT expiration and exposes a warning + extend flow.
 *
 * Behavior:
 * - Polls Amplify session every POLL_MS.
 * - When `exp - now < WARNING_SECONDS`, enters "warning" state.
 * - If the user has enabled "keep session in this browser", refreshes silently
 *   without surfacing the warning.
 * - `extend()` calls fetchAuthSession({ forceRefresh: true }) to get a new token.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { isKeepSessionEnabled } from "@/lib/sessionPreferences";

const WARNING_SECONDS = 120;
const POLL_MS = 15_000;

export type SessionStatus = "idle" | "warning" | "expired";

interface UseSessionExpiryOptions {
  enabled: boolean;
  onExpired: () => void;
}

interface UseSessionExpiryResult {
  status: SessionStatus;
  secondsLeft: number;
  extend: () => Promise<boolean>;
  dismiss: () => void;
}

function decodeExpSeconds(token: string | undefined): number | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

export function useSessionExpiry({
  enabled,
  onExpired,
}: UseSessionExpiryOptions): UseSessionExpiryResult {
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const dismissedRef = useRef(false);
  const refreshingRef = useRef(false);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (refreshingRef.current) return false;
    refreshingRef.current = true;
    try {
      const session = await fetchAuthSession({ forceRefresh: true });
      const ok = !!session.tokens?.idToken;
      if (ok) {
        dismissedRef.current = false;
        setStatus("idle");
      }
      return ok;
    } catch {
      return false;
    } finally {
      refreshingRef.current = false;
    }
  }, []);

  const extend = useCallback(async (): Promise<boolean> => {
    return refreshToken();
  }, [refreshToken]);

  const dismiss = useCallback((): void => {
    dismissedRef.current = true;
    setStatus("idle");
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function tick(): Promise<void> {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();
        const exp = decodeExpSeconds(token);
        if (!exp) return;

        const now = Math.floor(Date.now() / 1000);
        const remaining = exp - now;

        if (cancelled) return;

        if (remaining <= 0) {
          setSecondsLeft(0);
          setStatus("expired");
          onExpired();
          return;
        }

        setSecondsLeft(remaining);

        if (remaining <= WARNING_SECONDS) {
          if (isKeepSessionEnabled()) {
            await refreshToken();
            return;
          }
          if (!dismissedRef.current) {
            setStatus("warning");
          }
        } else {
          setStatus("idle");
        }
      } catch {
        // Session fetch failed — leave status as-is; next tick will retry.
      }
    }

    tick();
    const interval = window.setInterval(tick, POLL_MS);
    const onVisible = (): void => {
      if (document.visibilityState === "visible") {
        tick();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, onExpired, refreshToken]);

  return { status, secondsLeft, extend, dismiss };
}
