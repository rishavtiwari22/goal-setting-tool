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
    send_page_view: false
  });
}

export function trackPageView(path: string, title?: string): void {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title || document.title,
    page_location: window.location.href
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

export function trackDeviceTest(testType: string, result: 'pass' | 'fail'): void {
  trackEvent('device_test', {
    test_type: testType,
    result: result
  });
}

