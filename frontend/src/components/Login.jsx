import React, { useState, useEffect } from 'react';
import { authAPI } from '../services/api';

export default function Login() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log(`\n🔐 [${new Date().toISOString()}] Login Component Mounted`);
    checkAuth();
  }, []);

  const checkAuth = async () => {
    console.log(`\n🔍 [${new Date().toISOString()}] Checking Authentication`);
    try {
      const response = await authAPI.getMe();
      if (response.data.authenticated) {
        console.log(`✅ User is authenticated:`, response.data.user);
        setUser(response.data.user);
      } else {
        console.log(`ℹ️  User is not authenticated`);
      }
    } catch (error) {
      console.error(`❌ Auth check failed:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    console.log(`\n🔓 [${new Date().toISOString()}] Initiating Login`);
    console.log(`   Redirecting to: /auth/login`);
    authAPI.login();
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2>Welcome, {user.display_name || user.email}!</h2>
          <p>You are logged in as {user.email}</p>
          <button style={styles.button} onClick={() => window.location.href = '/inbox'}>
            Go to Inbox
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>📧 Mailler</h1>
        <p style={styles.subtitle}>Email Management Platform</p>
        <button style={styles.button} onClick={handleLogin}>
          Login with OpenID Connect
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5'
  },
  card: {
    backgroundColor: 'white',
    padding: '3rem',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    textAlign: 'center',
    maxWidth: '400px'
  },
  title: {
    fontSize: '2.5rem',
    margin: '0 0 1rem 0',
    color: '#333'
  },
  subtitle: {
    fontSize: '1.1rem',
    color: '#666',
    marginBottom: '2rem'
  },
  button: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    padding: '0.75rem 2rem',
    fontSize: '1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  }
};
