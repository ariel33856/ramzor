import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    const lastCaseId = localStorage.getItem('lastOpenedCaseId');
    if (lastCaseId) {
      navigate(createPageUrl('CasePersonal') + `?id=${lastCaseId}`);
    } else {
      navigate(createPageUrl('Dashboard'));
    }
  }, [navigate]);

  return null;
}