import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { accountsAPI } from '../services/api';
import { logger } from '../utils/logger';

export default function Settings() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    email_address: '',
    is_default: false
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const res = await accountsAPI.getAll();
      setAccounts(res.data.accounts);
    } catch (error) {
      logger.error('Failed to load accounts', { error });
    }
  };

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await accountsAPI.create(formData);
      setShowForm(false);
      setFormData({
        email_address: '',
        is_default: false
      });
      loadAccounts();
    } catch (error) {
      logger.error('Failed to add account', { error: error.message });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this account?')) return;

    try {
      await accountsAPI.delete(id);
      loadAccounts();
    } catch (error) {
      logger.error('Failed to delete account', { error: error.message });
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1>⚙️ Settings</h1>
        <button style={styles.button} onClick={() => navigate('/inbox')}>
          Back to Inbox
        </button>
      </header>

      <main style={styles.main}>
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2>Email Accounts</h2>
            <button style={styles.addButton} onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : '+ Add Account'}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} style={styles.form}>
              <h3>Add Email Account</h3>
              <p style={styles.helpText}>
                Accounts now store only the local email address and default flag. Import credentials are entered only when you run a Gmail import.
              </p>

              <div style={styles.formRow}>
                <div style={styles.field}>
                  <label style={styles.label}>Email Address *</label>
                  <input
                    type="email"
                    name="email_address"
                    value={formData.email_address}
                    onChange={handleChange}
                    style={styles.input}
                    required
                  />
                </div>
              </div>

              <div style={styles.checkboxField}>
                <input
                  type="checkbox"
                  name="is_default"
                  checked={formData.is_default}
                  onChange={handleChange}
                  id="is_default"
                />
                <label htmlFor="is_default" style={styles.checkboxLabel}>
                  Set as default account
                </label>
              </div>

              <button type="submit" style={styles.submitButton}>
                Add Account
              </button>
            </form>
          )}

          <div style={styles.accountsList}>
            {accounts.length === 0 ? (
              <p style={styles.empty}>No email accounts configured. Add one to get started.</p>
            ) : (
              accounts.map(account => (
                <div key={account.id} style={styles.accountCard}>
                  <div style={styles.accountInfo}>
                    <h3>{account.email_address}</h3>
                    {account.is_default && <span style={styles.badge}>Default</span>}
                    <p style={styles.accountDetails}>Local account used for sending and organizing imported mail.</p>
                  </div>
                  <button
                    style={styles.deleteButton}
                    onClick={() => handleDelete(account.id)}
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
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
  section: {
    maxWidth: '900px',
    margin: '0 auto'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem'
  },
  addButton: {
    backgroundColor: 'var(--success)',
    color: 'var(--text-on-accent)',
    border: '1px solid var(--success)',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  form: {
    backgroundColor: 'var(--bg-surface)',
    padding: '2rem',
    borderRadius: '12px',
    marginBottom: '2rem',
    boxShadow: 'var(--shadow-soft)',
    border: '1px solid var(--border-soft)'
  },
  helpText: {
    margin: '0 0 1.5rem 0',
    color: 'var(--text-muted)',
    lineHeight: '1.5'
  },
  formRow: {
    display: 'block',
    marginBottom: '1rem'
  },
  field: { flex: 1 },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: 'bold',
    fontSize: '0.9rem',
    color: 'var(--text-strong)'
  },
  input: {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid var(--border-soft)',
    borderRadius: '8px',
    fontSize: '1rem',
    backgroundColor: 'var(--bg-surface)',
    color: 'var(--text-body)',
    boxSizing: 'border-box'
  },
  checkboxField: {
    marginTop: '1rem',
    marginBottom: '1.5rem'
  },
  checkboxLabel: {
    marginLeft: '0.5rem',
    fontSize: '0.9rem',
    color: 'var(--text-body)'
  },
  submitButton: {
    backgroundColor: 'var(--accent)',
    color: 'var(--text-on-accent)',
    border: '1px solid var(--accent)',
    padding: '0.75rem 2rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem'
  },
  accountsList: {
    display: 'grid',
    gap: '1rem'
  },
  accountCard: {
    backgroundColor: 'var(--bg-surface)',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: 'var(--shadow-soft)',
    border: '1px solid var(--border-soft)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  accountInfo: { flex: 1 },
  accountDetails: {
    fontSize: '0.9rem',
    color: 'var(--text-muted)',
    margin: '0.5rem 0 0 0'
  },
  badge: {
    backgroundColor: 'var(--bg-success-soft)',
    color: 'var(--success)',
    padding: '0.25rem 0.5rem',
    borderRadius: '999px',
    fontSize: '0.75rem',
    marginLeft: '1rem',
    border: '1px solid rgba(47, 122, 92, 0.18)'
  },
  deleteButton: {
    backgroundColor: 'var(--danger)',
    color: 'var(--text-on-accent)',
    border: '1px solid var(--danger)',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  empty: {
    textAlign: 'center',
    color: 'var(--text-muted)',
    padding: '2rem'
  }
};
