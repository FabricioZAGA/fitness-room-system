import { createRootRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { WhatsNewDialog } from "@/components/shared/WhatsNewDialog";
import { SessionExpiryModal } from "@/components/shared/SessionExpiryModal";
import { useAuth } from "@/contexts/AuthContext";
import { useSessionExpiry } from "@/hooks/useSessionExpiry";
import { useCallback, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

function RootComponent(): React.JSX.Element {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useTranslation();

  const isLoginPage = pathname === "/login";
  const isLocalDev = import.meta.env.VITE_APP_ENV === "local";

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isLoginPage) {
      navigate({ to: "/login" });
    }
  }, [isLoading, isAuthenticated, isLoginPage, navigate]);

  const handleExpired = useCallback(async () => {
    await logout();
    toast.error(t("session.expiredToast"));
    navigate({ to: "/login" });
  }, [logout, navigate, t]);

  const { status, secondsLeft, extend, dismiss } = useSessionExpiry({
    enabled: isAuthenticated && !isLoginPage && !isLocalDev,
    onExpired: handleExpired,
  });

  async function handleExtend(): Promise<boolean> {
    const ok = await extend();
    if (!ok) {
      await handleExpired();
    }
    return ok;
  }

  async function handleLogoutFromModal(): Promise<void> {
    dismiss();
    await logout();
    navigate({ to: "/login" });
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[--bg-base]">
        <Loader2 className="h-8 w-8 animate-spin text-[--gold]" />
      </div>
    );
  }

  if (isLoginPage) {
    return (
      <ErrorBoundary>
        <Outlet />
        {import.meta.env.DEV && <TanStackRouterDevtools />}
      </ErrorBoundary>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-[--bg-base]">
        <Loader2 className="h-8 w-8 animate-spin text-[--gold]" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AppLayout>
        <Outlet />
      </AppLayout>
      <WhatsNewDialog />
      <SessionExpiryModal
        open={status === "warning"}
        secondsLeft={secondsLeft}
        onExtend={handleExtend}
        onLogout={handleLogoutFromModal}
      />
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </ErrorBoundary>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});
