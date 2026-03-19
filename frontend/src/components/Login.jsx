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
