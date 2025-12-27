// Unified Analytics Service - Combines GA4 and Mixpanel
import { 
  trackEvent as trackGA4Event,
  trackPageView as trackGA4PageView,
  trackInterviewStart as trackGA4InterviewStart,
  trackInterviewComplete as trackGA4InterviewComplete,
  trackJobSelection as trackGA4JobSelection,
  trackUserEngagement as trackGA4UserEngagement
} from './ga4';

import {
  trackMixpanelEvent,
  trackMixpanelPageView,
  trackMixpanelInterviewStart,
  trackMixpanelInterviewComplete,
  trackMixpanelJobSelection,
  trackMixpanelUserEngagement,
  identifyMixpanelUser,
  initializeMixpanel
} from './mixpanel';

// Unified tracking functions that send to both GA4 and Mixpanel
export function trackEvent(eventName: string, properties?: Record<string, any>): void {
  // Send to GA4
  trackGA4Event(eventName, properties);
  
  // Send to Mixpanel
  trackMixpanelEvent(eventName, properties);
}

export function trackPageView(path: string, title?: string): void {
  // Send to GA4
  trackGA4PageView(path, title);
  
  // Send to Mixpanel
  trackMixpanelPageView(title || path, { path });
}

export function trackInterviewStart(sessionId: string, jobTitle?: string): void {
  // Send to GA4
  trackGA4InterviewStart(sessionId, jobTitle);
  
  // Send to Mixpanel
  trackMixpanelInterviewStart(sessionId, jobTitle);
}

export function trackInterviewComplete(sessionId: string, duration?: number): void {
  // Send to GA4
  trackGA4InterviewComplete(sessionId, duration);
  
  // Send to Mixpanel
  trackMixpanelInterviewComplete(sessionId, duration);
}

export function trackJobSelection(jobTitle: string): void {
  // Send to GA4
  trackGA4JobSelection(jobTitle);
  
  // Send to Mixpanel
  trackMixpanelJobSelection(jobTitle);
}

export function trackUserEngagement(engagementType: string, details?: Record<string, any>): void {
  // Send to GA4
  trackGA4UserEngagement(engagementType, details);
  
  // Send to Mixpanel
  trackMixpanelUserEngagement(engagementType, details);
}

// Mixpanel-specific functions
export function identifyUser(userId: string, properties?: Record<string, any>): void {
  identifyMixpanelUser(userId, properties);
}

// Initialize both analytics services
export function initializeAnalytics(): void {
  initializeMixpanel();
  console.log('✅ Unified analytics initialized (GA4 + Mixpanel)');
}

// Export individual services for specific use cases
export * from './ga4';
export * from './mixpanel';