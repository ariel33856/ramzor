import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    const lastCaseId = localStorage.getItem('lastOpenedCaseId');
    const lastPersonId = localStorage.getItem('lastOpenedPersonId');
    if (lastCaseId && lastPersonId) {
      navigate(createPageUrl('CasePersonal') + `?id=${lastCaseId}`);
      // אחרי שנטוען את הדף, נתעדכן לאיש הקשר הנכון בעמוד עצמו
    } else {
      navigate(createPageUrl('Dashboard'));
    }
  }, [navigate]);

  return null;
}