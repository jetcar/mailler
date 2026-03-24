import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { logger } from '../utils/logger';

export default function Login() {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getMe();
      if (response.data.authenticated) {
        logger.info('Authenticated user returned to login page; redirecting to inbox');
        navigate('/inbox', { replace: true });
        return;
      }
    } catch (error) {
      logger.error('Auth check failed', { error });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
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
    background: 'radial-gradient(circle at top, var(--bg-accent-soft), var(--bg-app) 45%)'
  },
  card: {
    backgroundColor: 'var(--bg-surface)',
    padding: '3rem',
    borderRadius: '12px',
    boxShadow: 'var(--shadow-card)',
    textAlign: 'center',
    maxWidth: '400px',
    border: '1px solid var(--border-soft)'
  },
  title: {
    fontSize: '2.5rem',
    margin: '0 0 1rem 0',
    color: 'var(--text-strong)'
  },
  subtitle: {
    fontSize: '1.1rem',
    color: 'var(--text-muted)',
    marginBottom: '2rem'
  },
  button: {
    backgroundColor: 'var(--accent)',
    color: 'var(--text-on-accent)',
    border: '1px solid var(--accent)',
    padding: '0.75rem 2rem',
    fontSize: '1rem',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s, border-color 0.2s'
  }
};
