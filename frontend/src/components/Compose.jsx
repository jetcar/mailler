import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { messagesAPI, accountsAPI } from '../services/api';
import { logger } from '../utils/logger';

export default function Compose() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [formData, setFormData] = useState({
    account_id: '',
    to: '',
    cc: '',
    subject: '',
    text: ''
  });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const res = await accountsAPI.getAll();
      setAccounts(res.data.accounts);
      if (res.data.accounts.length > 0) {
        const defaultAccount = res.data.accounts.find(a => a.is_default) || res.data.accounts[0];
        setFormData(f => ({ ...f, account_id: defaultAccount.id }));
      }
    } catch (error) {
      logger.error('Failed to load accounts', { error });
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.account_id || !formData.to || !formData.subject) {
      logger.warn('Required fields missing for send email');
      return;
    }

    try {
      setSending(true);
      await messagesAPI.send(formData);
      navigate('/inbox');
    } catch (error) {
      logger.error('Failed to send email', { error: error.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1>📧 Compose Email</h1>
        <button style={styles.button} onClick={() => navigate('/inbox')}>
          Back to Inbox
        </button>
      </header>

      <main style={styles.main}>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>From:</label>
            <select
              name="account_id"
              value={formData.account_id}
              onChange={handleChange}
              style={styles.input}
              required
            >
              <option value="">Select account</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.email_address}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>To:</label>
            <input
              type="email"
              name="to"
              value={formData.to}
              onChange={handleChange}
              style={styles.input}
              placeholder="recipient@example.com"
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>CC:</label>
            <input
              type="text"
              name="cc"
              value={formData.cc}
              onChange={handleChange}
              style={styles.input}
              placeholder="cc@example.com (optional)"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Subject:</label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              style={styles.input}
              placeholder="Email subject"
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Message:</label>
            <textarea
              name="text"
              value={formData.text}
              onChange={handleChange}
              style={styles.textarea}
              rows={15}
              placeholder="Type your message here..."
              required
            />
          </div>

          <button
            type="submit"
            style={styles.submitButton}
            disabled={sending}
          >
            {sending ? 'Sending...' : 'Send Email'}
          </button>
        </form>
      </main>
    </div>
  );
}

const styles = {
  container: { height: '100vh', display: 'flex', flexDirection: 'column' },
  header: {
    backgroundColor: 'var(--accent)',
    color: 'var(--text-on-accent)',
    padding: '1rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  button: {
    backgroundColor: 'var(--bg-surface)',
    color: 'var(--accent)',
    border: '1px solid rgba(255, 255, 255, 0.45)',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  main: { flex: 1, padding: '2rem', overflowY: 'auto', backgroundColor: 'var(--bg-app)' },
  form: {
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: 'var(--bg-surface)',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: 'var(--shadow-soft)',
    border: '1px solid var(--border-soft)'
  },
  field: { marginBottom: '1.5rem' },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: 'bold',
    color: 'var(--text-strong)'
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    fontSize: '1rem',
    border: '1px solid var(--border-soft)',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-surface)',
    color: 'var(--text-body)',
    boxSizing: 'border-box'
  },
  textarea: {
    width: '100%',
    padding: '0.75rem',
    fontSize: '1rem',
    border: '1px solid var(--border-soft)',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-surface)',
    color: 'var(--text-body)',
    fontFamily: 'inherit',
    resize: 'vertical',
    boxSizing: 'border-box'
  },
  submitButton: {
    backgroundColor: 'var(--success)',
    color: 'var(--text-on-accent)',
    border: '1px solid var(--success)',
    padding: '0.75rem 2rem',
    fontSize: '1.1rem',
    borderRadius: '8px',
    cursor: 'pointer',
    width: '100%'
  }
};
