import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './styles/codeHighlight.css'
import { validateEnvironment } from './utils/env'
import { Toaster } from '@/components/ui/sonner'

try {
  validateEnvironment();
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
