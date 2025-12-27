declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

export function initializeGA4(measurementId: string): void {
  if (typeof window === 'undefined') return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function(...args: any[]) {
    window.dataLayer.push(args);
  };

  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: false,
    // Generate unique user ID for each session
    user_id: 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now(),
    // Cross-domain tracking for app.zuvy.org → zoe.zuvy.org
    linker: {
      domains: ['app.zuvy.org', 'zoe.zuvy.org']
    },
    // Custom campaign tracking for referrals
    custom_map: {
      'custom_parameter_1': 'source_platform'
    },
    // Enable debug mode for localhost
    debug_mode: window.location.hostname === 'localhost'
  });
}

export function trackPageView(path: string, title?: string): void {
  if (typeof window === 'undefined' || !window.gtag) return;

  // Smart title resolution with domain awareness
  let pageTitle = title;
  
  if (!pageTitle) {
    const docTitle = document.title;
    if (docTitle && docTitle !== 'Zoe - Your Learning Assistant') {
      pageTitle = docTitle;
    } else {
      // Generate title from path with domain context
      pageTitle = generateTitleFromPath(path, window.location.hostname);
    }
  }

  // Enhanced page view tracking with domain information
  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: pageTitle,
    page_location: window.location.href,
    page_domain: window.location.hostname,
    environment: getEnvironmentFromDomain(window.location.hostname),
    // Add session identifier to help GA4 distinguish users
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
    return 'Zoe AI Interviewer (Production)';
  } else if (domain.includes('amplifyapp.com')) {
    return 'Zoe AI Interviewer (Staging)';
  } else if (domain.includes('localhost')) {
    return 'Zoe AI Interviewer (Development)';
  } else {
    return 'Zoe AI Interviewer';
  }
}

// Helper to determine environment from domain
function getEnvironmentFromDomain(domain: string): string {
  if (domain.includes('zoe.zuvy.org')) {
    return 'production';
  } else if (domain.includes('amplifyapp.com')) {
    return 'staging';
  } else if (domain.includes('localhost')) {
    return 'development';
  } else {
    return 'unknown';
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
  
  try {
    // Decode JWT to get user info (basic decode, not verification)
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    trackEvent('user_entry_from_platform', {
      source_platform: 'app.zuvy.org',
      user_id: payload.sub || 'unknown',
      user_email: payload.email || 'unknown',
      user_role: payload.role || 'unknown',
      entry_method: 'token_redirect',
      timestamp: Date.now()
    });
    
    // Track user engagement for cross-platform flow
    trackEvent('user_engagement', {
      engagement_type: 'cross_platform_entry',
      source_platform: 'app.zuvy.org',
      target_platform: 'zoe.zuvy.org',
      user_id: payload.sub || 'unknown',
      session_start: true
    });
    
    // Set user properties for better tracking
    if (window.gtag) {
      window.gtag('config', import.meta.env.VITE_GA4_MEASUREMENT_ID, {
        user_id: payload.sub || 'user_' + Date.now(),
        custom_parameter_1: 'app_zuvy_referral'
      });
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

