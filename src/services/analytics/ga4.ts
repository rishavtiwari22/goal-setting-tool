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

  // Use provided title, or document title, or default to "Zoe - Your Learning Assistant"
  const pageTitle = title || document.title || "Zoe - Your Learning Assistant";

  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: pageTitle,
    page_location: window.location.href,
    // Add session identifier to help GA4 distinguish users
    session_id: 'session_' + Math.random().toString(36).substr(2, 9),
    timestamp: Date.now()
  });
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

