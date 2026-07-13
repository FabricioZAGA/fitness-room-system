import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";
import "./index.css";
import { configureAmplify } from "./lib/amplify";
import { applyTheme } from "./config/theme";
import { routeTree } from "./routeTree.gen";
import { AuthProvider } from "./contexts/AuthContext";
import "./i18n";

configureAmplify();

// Auto-recover from stale dynamic chunks after a deploy. When we ship a new
// build, `s3 sync --delete` removes the old hashed chunks; a tab left open from
// before the deploy fails its next import() (e.g. the lazy report-export
// module) with a preloadError. Reloading once pulls the fresh index + chunks.
// Guarded by a session flag so we never loop if the reload doesn't help.
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  if (sessionStorage.getItem("chunk-reload") === "1") return;
  sessionStorage.setItem("chunk-reload", "1");
  window.location.reload();
});

// Apply saved theme from localStorage before first render to prevent flash
try {
  const saved = localStorage.getItem("fitness-room-theme");
  if (saved) {
    const parsed = JSON.parse(saved) as { state?: { theme?: { mode?: string } } };
    const savedMode = parsed?.state?.theme?.mode;
    if (savedMode === "light" || savedMode === "dark") {
      applyTheme({ mode: savedMode });
    } else {
      applyTheme();
    }
  } else {
    applyTheme();
  }
} catch {
  applyTheme();
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 min default; overridden per-hook
      gcTime: 1000 * 60 * 10,   // 10 min garbage collection
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster position="top-right" richColors closeButton />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </AuthProvider>
  </StrictMode>
);
