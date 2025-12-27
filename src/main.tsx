import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './styles/codeHighlight.css'
import { validateEnvironment, ENV } from './utils/env'
import { Toaster } from '@/components/ui/sonner'

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

try {
  validateEnvironment();
  
  const ga4MeasurementId = ENV.GA4_MEASUREMENT_ID();
  if (ga4MeasurementId) {
    // Initialize dataLayer first
    window.dataLayer = window.dataLayer || [];
    
    // Create the gtag function
    window.gtag = function(...args: any[]) {
      window.dataLayer.push(args);
    };
    
    // Load the GA4 script first, then configure
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${ga4MeasurementId}`;
    
    // Configure GA4 after script loads
    script.onload = () => {
      window.gtag('js', new Date());
      window.gtag('config', ga4MeasurementId, {
        send_page_view: false,
        debug_mode: window.location.hostname === 'localhost'
      });
      console.log('✅ GA4 initialized successfully');
    };
    
    script.onerror = () => {
      console.error('❌ Failed to load GA4 script');
    };
    
    document.head.appendChild(script);
    
    // Track token-based entry if token exists in URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      // Import and use the token tracking function
      import('./services/analytics/ga4').then(({ trackTokenEntry }) => {
        trackTokenEntry(token);
      });
    }
  }
} catch (error) {
  const errorElement = document.createElement('div');
  errorElement.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: #1a202c;
    color: #f56565;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    z-index: 99999;
  `;
  errorElement.innerHTML = `
    <div style="max-width: 600px; background: #2d3748; padding: 2rem; border-radius: 8px; border: 2px solid #f56565;">
      <h1 style="color: #f56565; margin: 0 0 1rem 0; font-size: 1.5rem;">Configuration Error</h1>
      <pre style="color: #e2e8f0; white-space: pre-wrap; margin: 0; font-size: 0.9rem;">${(error as Error).message}</pre>
    </div>
  `;
  document.body.appendChild(errorElement);
  throw error;
}

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <App />
    <Toaster />
  </React.StrictMode>,
)
