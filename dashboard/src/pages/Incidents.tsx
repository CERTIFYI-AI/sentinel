import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Incidents() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/risk/incidents', { replace: true });
  }, [navigate]);
  return null;
}
