import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function RoleManager() {
  const navigate = useNavigate();
  useEffect(() => {
    sessionStorage.setItem('rbac_initial_tab', 'roles');
    navigate('/access-control', { replace: true });
  }, [navigate]);
  return null;
}
