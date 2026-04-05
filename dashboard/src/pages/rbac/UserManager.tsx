import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * UserManager — redirects to RBACDashboard with the Users tab pre-selected.
 * Uses sessionStorage so RBACDashboard can read the initial tab on mount.
 */
export default function UserManager() {
  const navigate = useNavigate();

  useEffect(() => {
    sessionStorage.setItem('rbac_initial_tab', 'users');
    navigate('/rbac', { replace: true });
  }, [navigate]);

  return null;
}
