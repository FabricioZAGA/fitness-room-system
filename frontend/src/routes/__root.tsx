import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { AppLayout } from "@/components/layout/AppLayout";

export const Route = createRootRoute({
  component: () => (
    <>
      <AppLayout>
        <Outlet />
      </AppLayout>
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </>
  ),
});
