import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps): React.JSX.Element {
  return (
    <div className="flex h-screen overflow-hidden bg-[--bg-base]">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-y-auto bg-[--bg-base]">
        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
}
