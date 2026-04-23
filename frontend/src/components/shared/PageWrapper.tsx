/** Standard page wrapper with consistent spacing used across all pages. */

interface PageWrapperProps {
  children: React.ReactNode;
}

export function PageWrapper({ children }: PageWrapperProps): React.JSX.Element {
  return (
    <div className="min-h-screen bg-[--bg-base] p-6">
      {children}
    </div>
  );
}
