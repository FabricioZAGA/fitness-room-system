import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const Route = createRootRoute({
  component: () => (
    <ErrorBoundary>
      <AppLayout>
        <Outlet />
      </AppLayout>
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </ErrorBoundary>
  ),
});
