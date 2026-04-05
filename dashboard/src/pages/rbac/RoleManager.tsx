import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * RoleManager — redirects to RBACDashboard with the Roles tab pre-selected.
 * Uses localStorage so RBACDashboard can read the initial tab on mount.
 */
export default function RoleManager() {
  const navigate = useNavigate();

  useEffect(() => {
    // Signal to RBACDashboard that we want the "roles" tab
    sessionStorage.setItem('rbac_initial_tab', 'roles');
    navigate('/rbac', { replace: true });
  }, [navigate]);

  return null;
}
