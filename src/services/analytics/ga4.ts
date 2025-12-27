declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

export function extractUTMParams(): { utm_source?: string; utm_medium?: string } {
  if (typeof window === 'undefined') return {};
  
  const params: { utm_source?: string; utm_medium?: string } = {};
  const fullUrl = window.location.href;
  
  const utmSourceMatch = fullUrl.match(/[?&]utm_source=([^&]*)/);
  const utmMediumMatch = fullUrl.match(/[?&]utm_medium=([^&]*)/);
  
  if (utmSourceMatch && utmSourceMatch[1]) {
    params.utm_source = decodeURIComponent(utmSourceMatch[1]);
  }
  
  if (utmMediumMatch && utmMediumMatch[1]) {
    params.utm_medium = decodeURIComponent(utmMediumMatch[1]);
  }
  
  return params;
}

export function setUTMUserProperties(): void {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  const utmParams = extractUTMParams();
  if (Object.keys(utmParams).length > 0) {
    window.gtag('set', 'user_properties', utmParams);
  }
}

export function trackPageView(path: string, title?: string): void {
  if (typeof window === 'undefined' || !window.gtag) return;

  setUTMUserProperties();

  let pageTitle = title;
  
  if (!pageTitle) {
    const docTitle = document.title;
    if (docTitle && docTitle !== 'Zoe - Your Learning Assistant') {
      pageTitle = docTitle;
    } else {
      pageTitle = generateTitleFromPath(path, window.location.hostname);
    }
  }

  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: pageTitle,
    page_location: window.location.href,
    page_domain: window.location.hostname,
    environment: getEnvironmentFromDomain(window.location.hostname),
    session_id: 'session_' + Math.random().toString(36).substr(2, 9),
    timestamp: Date.now()
  });
}

// Helper function to generate meaningful titles from paths with domain context
function generateTitleFromPath(path: string, domain: string): string {
  const pathname = path.split('?')[0]; // Remove query params for title generation
  const domainPrefix = getDomainPrefixForTitle(domain);
  
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
      // Convert path to readable title
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length > 0) {
        const lastSegment = segments[segments.length - 1];
        const readable = lastSegment
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());
        return `${readable} - ${domainPrefix}`;
      }
      return domainPrefix;
  }
}

// Helper to get domain-specific branding for titles
function getDomainPrefixForTitle(domain: string): string {
  if (domain.includes('zoe.zuvy.org')) {
    return 'Zoe: Your Learning Assistant';
  } else if (domain.includes('amplifyapp.com')) {
    return 'AI Interview (Staging)';
  } else {
    return 'AI Interview';
  }
}

// Helper to determine environment from domain
function getEnvironmentFromDomain(domain: string): string {
  if (domain.includes('zoe.zuvy.org')) {
    return 'production';
  } else if (domain.includes('amplifyapp.com')) {
    return 'staging';
  } else {
    return 'other';
  }
}

export function trackEvent(
  eventName: string,
  eventParams?: Record<string, any>
): void {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('event', eventName, eventParams);
}

export function trackInterviewStart(sessionId: string, jobTitle?: string): void {
  trackEvent('interview_start', {
    session_id: sessionId,
    job_title: jobTitle
  });
}

export function trackInterviewComplete(sessionId: string, duration?: number): void {
  trackEvent('interview_complete', {
    session_id: sessionId,
    duration: duration
  });
}

export function trackInterviewAbandon(sessionId: string, reason?: string): void {
  trackEvent('interview_abandon', {
    session_id: sessionId,
    reason: reason
  });
}

export function trackJobSelection(jobTitle: string): void {
  trackEvent('job_selection', {
    job_title: jobTitle
  });
}

export function trackResultsView(sessionId: string): void {
  trackEvent('results_view', {
    session_id: sessionId
  });
}

export function trackTokenEntry(token: string): void {
  if (!token) return;
  
  setUTMUserProperties();
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    trackEvent('user_entry_from_platform', {
      source_platform: 'app.zuvy.org',
      user_id: payload.sub || 'unknown',
      user_email: payload.email || 'unknown',
      user_role: payload.role || 'unknown',
      entry_method: 'token_redirect',
      timestamp: Date.now()
    });
    
    trackEvent('user_engagement', {
      engagement_type: 'cross_platform_entry',
      source_platform: 'app.zuvy.org',
      target_platform: 'zoe.zuvy.org',
      user_id: payload.sub || 'unknown',
      session_start: true
    });
    
    if (window.gtag) {
      const utmParams = extractUTMParams();
      const configParams: Record<string, any> = {
        user_id: payload.sub || 'user_' + Date.now(),
        custom_parameter_1: 'app_zuvy_referral'
      };
      
      if (Object.keys(utmParams).length > 0) {
        configParams.user_properties = utmParams;
      }
      
      window.gtag('config', import.meta.env.VITE_GA4_MEASUREMENT_ID, configParams);
    }
  } catch (error) {
    console.warn('Could not decode token for analytics:', error);
    trackEvent('user_entry_from_platform', {
      source_platform: 'app.zuvy.org',
      entry_method: 'token_redirect_failed',
      timestamp: Date.now()
    });
  }
}

// Enhanced user engagement tracking functions
export function trackUserEngagement(engagementType: string, details?: Record<string, any>): void {
  trackEvent('user_engagement', {
    engagement_type: engagementType,
    platform: 'zoe.zuvy.org',
    domain: window.location.hostname,
    environment: getEnvironmentFromDomain(window.location.hostname),
    timestamp: Date.now(),
    ...details
  });
}

export function trackInterviewEngagement(action: string, sessionId: string, details?: Record<string, any>): void {
  trackUserEngagement('interview_interaction', {
    action,
    session_id: sessionId,
    interview_stage: details?.stage || 'unknown',
    time_spent: details?.timeSpent || 0,
    ...details
  });
}

export function trackPageEngagement(pagePath: string, timeSpent: number, interactions: number = 0): void {
  trackUserEngagement('page_interaction', {
    page_path: pagePath,
    time_spent_seconds: Math.round(timeSpent / 1000),
    interaction_count: interactions,
    engagement_level: timeSpent > 30000 ? 'high' : timeSpent > 10000 ? 'medium' : 'low'
  });
}

export function trackFeatureUsage(feature: string, usage_type: string, details?: Record<string, any>): void {
  trackUserEngagement('feature_usage', {
    feature_name: feature,
    usage_type,
    platform: 'zoe.zuvy.org',
    ...details
  });
}

export function trackCrossPlatformJourney(step: string, details?: Record<string, any>): void {
  trackUserEngagement('cross_platform_journey', {
    journey_step: step,
    source_platform: 'app.zuvy.org',
    target_platform: window.location.hostname,
    target_environment: getEnvironmentFromDomain(window.location.hostname),
    ...details
  });
}

