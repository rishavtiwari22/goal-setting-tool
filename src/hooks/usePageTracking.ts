import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '@/services/analytics/ga4';

// Dynamic page titles based on routes and domain
const getPageTitle = (pathname: string, domain: string): string => {
  const domainPrefix = getDomainPrefix(domain);
  
  switch (pathname) {
    case '/':
      return `Home - ${domainPrefix}`;
    case '/selfapply':
      return `Job Selection - ${domainPrefix}`;
    case '/results':
      return `Interview Results - ${domainPrefix}`;
    default:
      if (pathname.startsWith('/interview/')) {
        return `AI Interview Session - ${domainPrefix}`;
      }
      // Fallback to document title or default
      return document.title || `${domainPrefix}`;
  }
};

// Helper to get domain-specific branding
const getDomainPrefix = (domain: string): string => {
  if (domain.includes('zoe.zuvy.org')) {
    return 'Zoe AI Interviewer (Production)';
  } else if (domain.includes('amplifyapp.com')) {
    return 'AI Interview (Staging)';
  } else if (domain.includes('app.zuvy.org')) {
    return 'Zuvy Learning Platform';
  } else {
    return 'AI Interview';
  }
};

export function usePageTracking(): void {
  const location = useLocation();

  useEffect(() => {
    const fullPath = location.pathname + location.search;
    const currentDomain = window.location.hostname;
    const dynamicTitle = getPageTitle(location.pathname, currentDomain);
    
    console.log('📄 Page tracking:', fullPath, '|', dynamicTitle, '| Domain:', currentDomain);
    
    // Use dynamic title based on current route and domain
    trackPageView(fullPath, dynamicTitle);
  }, [location]);
}

