import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Login from './components/Login';
import Inbox from './components/Inbox';
import Compose from './components/Compose';
import Settings from './components/Settings';
import './App.css';

// Navigation logger component
function NavigationLogger() {
  const location = useLocation();

  useEffect(() => {
    console.log(`\n📍 [${new Date().toISOString()}] Navigation`);
    console.log(`   Path: ${location.pathname}`);
    console.log(`   Search: ${location.search || '(none)'}`);
    console.log(`   Hash: ${location.hash || '(none)'}`);
  }, [location]);

  return null;
}

export default function App() {
  useEffect(() => {
    console.log(`\n🚀 [${new Date().toISOString()}] Application Started`);
    console.log(`   Environment: ${import.meta.env.MODE}`);
    console.log(`   API URL: ${import.meta.env.VITE_API_URL || 'http://localhost:3000'}`);
  }, []);

  return (
    <BrowserRouter>
      <NavigationLogger />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/compose" element={<Compose />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  );
}
