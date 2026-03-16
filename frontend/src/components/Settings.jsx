import React, { useState, useEffect } from 'react';
import { accountsAPI } from '../services/api';

export default function Settings() {
  const [accounts, setAccounts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    email_address: '',
    imap_host: '',
    imap_port: 993,
    imap_username: '',
    imap_password: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
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
      console.error('Failed to load accounts:', error);
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
      alert('Account added successfully!');
      setShowForm(false);
      setFormData({
        email_address: '',
        imap_host: '',
        imap_port: 993,
        imap_username: '',
        imap_password: '',
        smtp_host: '',
        smtp_port: 587,
        smtp_username: '',
        smtp_password: '',
        is_default: false
      });
      loadAccounts();
    } catch (error) {
      alert('Failed to add account: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this account?')) return;
    
    try {
      await accountsAPI.delete(id);
      alert('Account deleted successfully!');
      loadAccounts();
    } catch (error) {
      alert('Failed to delete account: ' + error.message);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1>⚙️ Settings</h1>
        <button style={styles.button} onClick={() => window.location.href = '/inbox'}>
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

              <h4>IMAP Settings (Receiving)</h4>
              <div style={styles.formRow}>
                <div style={styles.field}>
                  <label style={styles.label}>IMAP Host *</label>
                  <input
                    type="text"
                    name="imap_host"
                    value={formData.imap_host}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="imap.gmail.com"
                    required
                  />
                </div>
                <div style={styles.fieldSmall}>
                  <label style={styles.label}>Port</label>
                  <input
                    type="number"
                    name="imap_port"
                    value={formData.imap_port}
                    onChange={handleChange}
                    style={styles.input}
                    required
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.field}>
                  <label style={styles.label}>IMAP Username *</label>
                  <input
                    type="text"
                    name="imap_username"
                    value={formData.imap_username}
                    onChange={handleChange}
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>IMAP Password *</label>
                  <input
                    type="password"
                    name="imap_password"
                    value={formData.imap_password}
                    onChange={handleChange}
                    style={styles.input}
                    required
                  />
                </div>
              </div>

              <h4>SMTP Settings (Sending)</h4>
              <div style={styles.formRow}>
                <div style={styles.field}>
                  <label style={styles.label}>SMTP Host *</label>
                  <input
                    type="text"
                    name="smtp_host"
                    value={formData.smtp_host}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="smtp.gmail.com"
                    required
                  />
                </div>
                <div style={styles.fieldSmall}>
                  <label style={styles.label}>Port</label>
                  <input
                    type="number"
                    name="smtp_port"
                    value={formData.smtp_port}
                    onChange={handleChange}
                    style={styles.input}
                    required
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.field}>
                  <label style={styles.label}>SMTP Username *</label>
                  <input
                    type="text"
                    name="smtp_username"
                    value={formData.smtp_username}
                    onChange={handleChange}
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>SMTP Password *</label>
                  <input
                    type="password"
                    name="smtp_password"
                    value={formData.smtp_password}
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
                    <p style={styles.accountDetails}>
                      IMAP: {account.imap_host}:{account.imap_port}<br />
                      SMTP: {account.smtp_host}:{account.smtp_port}
                    </p>
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
    backgroundColor: '#007bff',
    color: 'white',
    padding: '1rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  button: {
    backgroundColor: 'white',
    color: '#007bff',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  main: { flex: 1, padding: '2rem', overflowY: 'auto', backgroundColor: '#f9f9f9' },
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
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  form: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    marginBottom: '2rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    marginBottom: '1rem'
  },
  field: { flex: 1 },
  fieldSmall: { flex: '0 0 120px' },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: 'bold',
    fontSize: '0.9rem'
  },
  input: {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
    boxSizing: 'border-box'
  },
  checkboxField: {
    marginTop: '1rem',
    marginBottom: '1.5rem'
  },
  checkboxLabel: {
    marginLeft: '0.5rem',
    fontSize: '0.9rem'
  },
  submitButton: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    padding: '0.75rem 2rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem'
  },
  accountsList: {
    display: 'grid',
    gap: '1rem'
  },
  accountCard: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  accountInfo: { flex: 1 },
  accountDetails: {
    fontSize: '0.9rem',
    color: '#666',
    margin: '0.5rem 0 0 0'
  },
  badge: {
    backgroundColor: '#28a745',
    color: 'white',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    marginLeft: '1rem'
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  empty: {
    textAlign: 'center',
    color: '#999',
    padding: '2rem'
  }
};
