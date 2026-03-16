import React, { useState, useEffect } from 'react';
import { messagesAPI, accountsAPI, authAPI } from '../services/api';

export default function Inbox() {
  const [messages, setMessages] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      const authRes = await authAPI.getMe();
      if (!authRes.data.authenticated) {
        window.location.href = '/';
        return;
      }
      setUser(authRes.data.user);

      const [messagesRes, accountsRes] = await Promise.all([
        messagesAPI.getAll(),
        accountsAPI.getAll()
      ]);

      setMessages(messagesRes.data.messages);
      setAccounts(accountsRes.data.accounts);
    } catch (error) {
      console.error('Failed to load inbox:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (accounts.length === 0) {
      alert('Please add an email account first');
      return;
    }

    try {
      setLoading(true);
      await messagesAPI.sync(accounts[0].id);
      const messagesRes = await messagesAPI.getAll();
      setMessages(messagesRes.data.messages);
      alert('Sync completed!');
    } catch (error) {
      alert('Sync failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const selectMessage = async (msg) => {
    try {
      const res = await messagesAPI.get(msg.id);
      setSelectedMessage(res.data.message);
      
      // Mark as read
      if (!msg.is_read) {
        await messagesAPI.update(msg.id, { is_read: true });
        setMessages(messages.map(m => 
          m.id === msg.id ? { ...m, is_read: true } : m
        ));
      }
    } catch (error) {
      console.error('Failed to load message:', error);
    }
  };

  if (loading) {
    return <div style={styles.loading}>Loading...</div>;
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1>📧 Mailler</h1>
        <div>
          <span style={{marginRight: '1rem'}}>{user?.email}</span>
          <button style={styles.button} onClick={handleSync}>Sync</button>
          <button style={styles.button} onClick={() => window.location.href = '/compose'}>Compose</button>
          <button style={styles.button} onClick={() => window.location.href = '/settings'}>Settings</button>
          <button style={styles.button} onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div style={styles.main}>
        <aside style={styles.sidebar}>
          <h3>Messages ({messages.length})</h3>
          {messages.length === 0 ? (
            <p style={styles.empty}>No messages. Click Sync to fetch emails.</p>
          ) : (
            <ul style={styles.messageList}>
              {messages.map(msg => (
                <li
                  key={msg.id}
                  style={{
                    ...styles.messageItem,
                    ...(msg.is_read ? {} : styles.unread),
                    ...(selectedMessage?.id === msg.id ? styles.selected : {})
                  }}
                  onClick={() => selectMessage(msg)}
                >
                  <div style={styles.messageFrom}>{msg.from_address}</div>
                  <div style={styles.messageSubject}>{msg.subject}</div>
                  <div style={styles.messageDate}>
                    {new Date(msg.received_date).toLocaleDateString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <main style={styles.content}>
          {selectedMessage ? (
            <div>
              <h2>{selectedMessage.subject}</h2>
              <div style={styles.messageHeader}>
                <div><strong>From:</strong> {selectedMessage.from_address}</div>
                <div><strong>To:</strong> {selectedMessage.to_addresses}</div>
                {selectedMessage.cc_addresses && (
                  <div><strong>CC:</strong> {selectedMessage.cc_addresses}</div>
                )}
                <div><strong>Date:</strong> {new Date(selectedMessage.received_date).toLocaleString()}</div>
              </div>
              <hr />
              <div style={styles.messageBody}>
                {selectedMessage.body_html ? (
                  <div dangerouslySetInnerHTML={{ __html: selectedMessage.body_html }} />
                ) : (
                  <pre style={styles.messageText}>{selectedMessage.body_text}</pre>
                )}
              </div>
            </div>
          ) : (
            <div style={styles.emptyMessage}>
              <p>Select a message to read</p>
            </div>
          )}
        </main>
      </div>
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
    margin: '0 0.25rem',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  main: { display: 'flex', flex: 1, overflow: 'hidden' },
  sidebar: {
    width: '350px',
    borderRight: '1px solid #ddd',
    overflowY: 'auto',
    padding: '1rem',
    backgroundColor: '#f9f9f9'
  },
  content: { flex: 1, padding: '2rem', overflowY: 'auto' },
  messageList: { listStyle: 'none', padding: 0, margin: 0 },
  messageItem: {
    padding: '0.75rem',
    borderBottom: '1px solid #eee',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  unread: { fontWeight: 'bold', backgroundColor: '#f0f8ff' },
  selected: { backgroundColor: '#e3f2fd' },
  messageFrom: { fontSize: '0.9rem', color: '#333' },
  messageSubject: { fontSize: '1rem', margin: '0.25rem 0' },
  messageDate: { fontSize: '0.8rem', color: '#999' },
  messageHeader: {
    backgroundColor: '#f5f5f5',
    padding: '1rem',
    borderRadius: '4px',
    marginBottom: '1rem',
    fontSize: '0.9rem'
  },
  messageBody: { lineHeight: '1.6' },
  messageText: {
    whiteSpace: 'pre-wrap',
    fontFamily: 'inherit'
  },
  empty: { color: '#999', textAlign: 'center', marginTop: '2rem' },
  emptyMessage: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#999'
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    fontSize: '1.5rem'
  }
};
