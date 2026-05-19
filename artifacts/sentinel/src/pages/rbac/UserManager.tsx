import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function UserManager() {
  const navigate = useNavigate();
  useEffect(() => {
    sessionStorage.setItem('rbac_initial_tab', 'users');
    navigate('/access-control', { replace: true });
  }, [navigate]);
  return null;
}
