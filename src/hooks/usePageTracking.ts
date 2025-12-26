import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '@/services/analytics/ga4';

export function usePageTracking(): void {
  const location = useLocation();

  useEffect(() => {
    const fullPath = location.pathname + location.search;
    console.log('📄 Page tracking:', fullPath);
    
    // Pass correct title explicitly
    trackPageView(fullPath, "Zoe - Your Learning Assistant");
  }, [location]);
}

