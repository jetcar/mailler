import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Log application startup
console.log('%c╔════════════════════════════════════════╗', 'color: #4CAF50; font-weight: bold');
console.log('%c║   📧 Mailler Frontend Starting...    ║', 'color: #4CAF50; font-weight: bold');
console.log('%c╚════════════════════════════════════════╝', 'color: #4CAF50; font-weight: bold');
console.log('');
console.log(`%c🕐 Time:        ${new Date().toLocaleString()}`, 'color: #2196F3');
console.log(`%c🌐 Mode:        ${import.meta.env.MODE}`, 'color: #2196F3');
console.log(`%c📡 API URL:     ${import.meta.env.VITE_API_URL || 'http://localhost:3000'}`, 'color: #2196F3');
console.log(`%c🔍 Base URL:    ${window.location.origin}`, 'color: #2196F3');
console.log('');
console.log('%c💡 Request logging is enabled - check console for API calls', 'color: #FF9800; font-style: italic');
console.log('');

// Global error handler
window.addEventListener('error', (event) => {
  console.error(`\n❌ [${new Date().toISOString()}] Global Error`);
  console.error(`   Message: ${event.message}`);
  console.error(`   File: ${event.filename}`);
  console.error(`   Line: ${event.lineno}:${event.colno}`);
  console.error(`   Error:`, event.error);
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error(`\n❌ [${new Date().toISOString()}] Unhandled Promise Rejection`);
  console.error(`   Reason:`, event.reason);
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
