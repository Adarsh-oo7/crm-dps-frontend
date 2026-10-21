import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { can, type ModuleKey } from '../../access';

export default function RequireModule({ module, children }: { module: ModuleKey; children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  if (!can(user, module)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
