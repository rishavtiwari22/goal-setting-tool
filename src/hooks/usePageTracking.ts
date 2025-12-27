import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '@/services/analytics/ga4';

// Dynamic page titles based on routes
const getPageTitle = (pathname: string): string => {
  switch (pathname) {
    case '/':
      return 'Home - Zoe AI Interviewer';
    case '/selfapply':
      return 'Job Selection - Zoe AI Interviewer';
    case '/results':
      return 'Interview Results - Zoe AI Interviewer';
    default:
      if (pathname.startsWith('/interview/')) {
        return 'AI Interview Session - Zoe AI Interviewer';
      }
      // Fallback to document title or default
      return document.title || 'Zoe - Your Learning Assistant';
  }
};

export function usePageTracking(): void {
  const location = useLocation();

  useEffect(() => {
    const fullPath = location.pathname + location.search;
    const dynamicTitle = getPageTitle(location.pathname);
    
    console.log('📄 Page tracking:', fullPath, '|', dynamicTitle);
    
    // Use dynamic title based on current route
    trackPageView(fullPath, dynamicTitle);
  }, [location]);
}

