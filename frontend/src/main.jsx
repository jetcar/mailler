import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { logger } from './utils/logger';

// Global error handler
window.addEventListener('error', (event) => {
  logger.error('Global error', {
    message: event.message,
    file: event.filename,
    line: `${event.lineno}:${event.colno}`,
    error: event.error
  });
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection', { reason: event.reason });
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
