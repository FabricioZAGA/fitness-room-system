import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps): React.JSX.Element {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-y-auto bg-slate-950">
        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
}
