import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Login from './components/Login';
import Inbox from './components/Inbox';
import MessageList from './components/MessageList';
import MessageDetail from './components/MessageDetail';
import Compose from './components/Compose';
import Settings from './components/Settings';
import './App.css';
import { getApiBaseUrl, routerBasename } from './config/appPaths';
import { logger } from './utils/logger';

// Navigation logger component
function NavigationLogger() {
  const location = useLocation();

  useEffect(() => {
    logger.debug('Navigation changed', {
      path: location.pathname,
      search: location.search,
      hash: location.hash
    });
  }, [location]);

  return null;
}

export default function App() {
  useEffect(() => {
    logger.info('Application started', {
      environment: import.meta.env.MODE,
      apiUrl: getApiBaseUrl(),
      basename: routerBasename
    });
  }, []);

  return (
    <BrowserRouter basename={routerBasename}>
      <NavigationLogger />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/inbox" element={<Inbox />}>
          <Route index element={<MessageList />} />
          <Route path=":messageId" element={<MessageDetail />} />
        </Route>
        <Route path="/compose" element={<Compose />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  );
}
