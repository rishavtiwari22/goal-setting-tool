declare global {
  interface Window {
    mixpanel: any;
  }
}

// Mixpanel Analytics Service
export function trackMixpanelEvent(eventName: string, properties?: Record<string, any>): void {
  if (typeof window === 'undefined' || !window.mixpanel) return;

  try {
    // Check if Mixpanel is properly loaded
    if (typeof window.mixpanel.track !== 'function') {
      console.warn('Mixpanel not fully loaded yet, skipping event:', eventName);
      return;
    }

    window.mixpanel.track(eventName, {
      ...properties,
      timestamp: new Date().toISOString(),
      domain: window.location.hostname,
      page_url: window.location.href
    });
  } catch (error) {
    console.warn('Mixpanel tracking error:', error);
  }
}

export function trackMixpanelPageView(pageName: string, properties?: Record<string, any>): void {
  trackMixpanelEvent('Page View', {
    page_name: pageName,
    page_path: window.location.pathname,
    ...properties
  });
}

export function identifyMixpanelUser(userId: string, properties?: Record<string, any>): void {
  if (typeof window === 'undefined' || !window.mixpanel) return;

  try {
    // Check if Mixpanel is properly loaded
    if (typeof window.mixpanel.identify !== 'function') {
      console.warn('Mixpanel not fully loaded yet, skipping identify');
      return;
    }

    window.mixpanel.identify(userId);
    if (properties && typeof window.mixpanel.people?.set === 'function') {
      window.mixpanel.people.set(properties);
    }
  } catch (error) {
    console.warn('Mixpanel identify error:', error);
  }
}

// Interview-specific Mixpanel tracking
export function trackMixpanelInterviewStart(sessionId: string, jobTitle?: string): void {
  trackMixpanelEvent('Interview Started', {
    session_id: sessionId,
    job_title: jobTitle,
    interview_type: 'ai_interview'
  });
}

export function trackMixpanelInterviewComplete(sessionId: string, duration?: number): void {
  trackMixpanelEvent('Interview Completed', {
    session_id: sessionId,
    duration_ms: duration,
    completion_status: 'completed'
  });
}

export function trackMixpanelJobSelection(jobTitle: string): void {
  trackMixpanelEvent('Job Selected', {
    job_title: jobTitle,
    selection_method: 'manual'
  });
}

export function trackMixpanelUserEngagement(engagementType: string, details?: Record<string, any>): void {
  trackMixpanelEvent('User Engagement', {
    engagement_type: engagementType,
    ...details
  });
}

// Initialize Mixpanel with user properties
export function initializeMixpanel(): void {
  if (typeof window === 'undefined' || !window.mixpanel) {
    console.warn('Mixpanel script not loaded');
    return;
  }

  try {
    // Get token from environment or window
    const mixpanelToken = import.meta.env.VITE_MIXPANEL_PROJECT_TOKEN || 
                         (window as any).mixpanelToken || 
                         '8c8b5f2aa31e658bef51b6ded4ae056c';

    // Check if Mixpanel is already initialized
    if (window.mixpanel.__loaded) {
      console.log('✅ Mixpanel already initialized');
      return;
    }

    // Initialize Mixpanel with proper configuration
    if (typeof window.mixpanel.init === 'function') {
      window.mixpanel.init(mixpanelToken, {
        autocapture: false, // Disable autocapture to avoid CORS issues
        record_sessions_percent: 0, // Disable session recording to avoid CORS issues
        debug: window.location.hostname === 'localhost',
        cross_subdomain_cookie: false,
        secure_cookie: true,
        persistence: 'localStorage',
        api_host: 'https://api.mixpanel.com' // Use standard API endpoint
      });

      // Set super properties (sent with every event)
      if (typeof window.mixpanel.register === 'function') {
        window.mixpanel.register({
          platform: 'web',
          app_name: 'Zoe AI Interviewer',
          environment: getEnvironmentFromDomain(window.location.hostname),
          domain: window.location.hostname
        });
      }

      console.log('✅ Mixpanel initialized successfully');
    } else {
      console.warn('Mixpanel init function not available');
    }
  } catch (error) {
    console.warn('Mixpanel initialization error:', error);
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