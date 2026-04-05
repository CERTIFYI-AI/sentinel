import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function BiasAudits() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/bias-audits', { replace: true });
  }, [navigate]);
  return null;
}
