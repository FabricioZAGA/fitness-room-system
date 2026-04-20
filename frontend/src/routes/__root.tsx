import { createRootRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

function RootComponent(): React.JSX.Element {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isLoginPage) {
      navigate({ to: "/login" });
    }
  }, [isLoading, isAuthenticated, isLoginPage, navigate]);

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
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </ErrorBoundary>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});
