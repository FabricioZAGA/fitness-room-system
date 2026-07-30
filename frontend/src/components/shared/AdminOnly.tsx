/** Wrapper that renders children only when the current user is an admin. */

import { useAuth } from "@/contexts/AuthContext";

interface AdminOnlyProps {
  children: React.ReactNode;
  /** Optional fallback rendered for non-admin users. */
  fallback?: React.ReactNode;
}

export function AdminOnly({ children, fallback = null }: AdminOnlyProps): React.JSX.Element {
  const { isAdmin } = useAuth();
  return <>{isAdmin ? children : fallback}</>;
}
