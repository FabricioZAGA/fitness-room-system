import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps): React.JSX.Element {
  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-y-auto">
        <div className="flex-1 p-6">{children}</div>
      </main>
    </div>
  );
}
