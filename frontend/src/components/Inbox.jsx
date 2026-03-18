import React, { useState, useEffect } from 'react';
import { messagesAPI, accountsAPI, authAPI } from '../services/api';

export default function Inbox() {
  const [messages, setMessages] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [importStep, setImportStep] = useState(1); // 1: credentials, 2: folder selection
  const [availableFolders, setAvailableFolders] = useState([]);
  const [selectedFolders, setSelectedFolders] = useState({});
  const [importData, setImportData] = useState({
    imap_host: 'imap.gmail.com',
    imap_port: 993,
    imap_username: '',
    imap_password: ''
  });
  const [importProgress, setImportProgress] = useState({
    isImporting: false,
    currentFolder: '',
    currentFolderIndex: 0,
    totalFolders: 0,
    totalImported: 0,
    totalSkipped: 0,
    folderResults: [],
    logs: []
  });
  const [selectedFolder, setSelectedFolder] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [currentSessionId, setCurrentSessionId] = useState(null);

  useEffect(() => {
    init();
  }, []);

  // Auto-scroll logs to bottom when new logs arrive
  useEffect(() => {
    if (importProgress.logs.length > 0) {
      const logsContainer = document.querySelector('[data-logs-container]');
      if (logsContainer) {
        logsContainer.scrollTop = logsContainer.scrollHeight;
      }
    }
  }, [importProgress.logs]);

  // Helper function to save data as JSON file
  const saveDebugFile = (data, filename) => {
    try {
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      console.log(`✅ Debug file saved: ${filename}`);
    } catch (error) {
      console.error('Failed to save debug file:', error);
    }
  };

  const init = async () => {
    const maxRetries = 10;
    const initialDelay = 1000; // 1 second

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
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
        setFilteredMessages(messagesRes.data.messages);
        setAccounts(accountsRes.data.accounts);

        // Success - break out of retry loop
        break;
      } catch (error) {
        const is503 = error.response?.status === 503;
        const isNetworkError = !error.response && error.message?.includes('Network Error');

        if ((is503 || isNetworkError) && attempt < maxRetries) {
          const delay = initialDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`Backend not ready (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else if (attempt === maxRetries) {
          console.error('Failed to load inbox after maximum retries:', error);
          console.error('Unable to connect to server. Please refresh the page to try again.');
        } else {
          console.error('Failed to load inbox:', error);
          break;
        }
      }
    }

    setLoading(false);
  };

  // Filter messages based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMessages(messages);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = messages.filter(msg =>
      msg.subject?.toLowerCase().includes(query) ||
      msg.from_address?.toLowerCase().includes(query) ||
      msg.body_text?.toLowerCase().includes(query)
    );
    setFilteredMessages(filtered);
    setCurrentPage(1); // Reset to first page on search
  }, [searchQuery, messages]);

  // Get unique folders from messages
  const folders = ['All', ...new Set(messages.map(msg => msg.folder).filter(Boolean))];

  // Filter messages by selected folder and search
  const folderFilteredMessages = selectedFolder === 'All'
    ? filteredMessages
    : filteredMessages.filter(msg => msg.folder === selectedFolder);

  // Pagination
  const totalPages = Math.ceil(folderFilteredMessages.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMessages = folderFilteredMessages.slice(startIndex, endIndex);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const toggleSelectMessage = (messageId) => {
    const newSelected = new Set(selectedMessageIds);
    if (newSelected.has(messageId)) {
      newSelected.delete(messageId);
    } else {
      newSelected.add(messageId);
    }
    setSelectedMessageIds(newSelected);
  };

  const toggleSelectAll = () => {
    const currentPageIds = paginatedMessages.map(m => m.id);
    const allCurrentSelected = currentPageIds.every(id => selectedMessageIds.has(id));

    if (allCurrentSelected) {
      // Deselect all on current page
      setSelectedMessageIds(prev => {
        const newSet = new Set(prev);
        currentPageIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    } else {
      // Select all on current page
      setSelectedMessageIds(prev => new Set([...prev, ...currentPageIds]));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedMessageIds.size === 0) {
      console.warn('No messages selected for deletion');
      return;
    }

    if (!confirm(`Delete ${selectedMessageIds.size} selected message(s)?`)) {
      return;
    }

    try {
      setLoading(true);
      const deletePromises = Array.from(selectedMessageIds).map(id =>
        messagesAPI.delete(id)
      );
      await Promise.all(deletePromises);

      const messagesRes = await messagesAPI.getAll();
      setMessages(messagesRes.data.messages);
      setFilteredMessages(messagesRes.data.messages);
      setSelectedMessageIds(new Set());
      setSelectedMessage(null);
    } catch (error) {
      console.error('Failed to delete messages:', error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!confirm('Delete this message?')) {
      return;
    }

    try {
      setLoading(true);
      await messagesAPI.delete(messageId);

      const messagesRes = await messagesAPI.getAll();
      setMessages(messagesRes.data.messages);
      setFilteredMessages(messagesRes.data.messages);
      setSelectedMessage(null);
      setSelectedMessageIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });
    } catch (error) {
      console.error('Failed to delete message:', error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (accounts.length === 0) {
      console.warn('No email account available for sync');
      return;
    }

    try {
      setLoading(true);
      await messagesAPI.sync(accounts[0].id);
      const messagesRes = await messagesAPI.getAll();
      setMessages(messagesRes.data.messages);
      setFilteredMessages(messagesRes.data.messages);
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchFolders = async (e) => {
    e.preventDefault();

    if (!importData.imap_username || !importData.imap_password) {
      console.warn('IMAP credentials required for folder fetch');
      return;
    }

    try {
      setLoading(true);

      const res = await messagesAPI.fetchFolders({
        imap_host: importData.imap_host,
        imap_port: importData.imap_port,
        imap_username: importData.imap_username,
        imap_password: importData.imap_password
      });

      setAvailableFolders(res.data.folders);

      // Auto-select common folders
      const autoSelect = {};
      res.data.folders.forEach(folder => {
        const name = folder.name.toLowerCase();
        if (name === 'inbox' || name === '[gmail]/all mail' || name.includes('sent')) {
          autoSelect[folder.name] = true;
        }
      });
      setSelectedFolders(autoSelect);

      setImportStep(2);
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message;

      if (errorMsg.includes('Application-specific password')) {
        console.error(
          '⚠️ Gmail requires an App Password for IMAP access.\n\n' +
          'Steps to fix:\n' +
          '1. Go to: https://myaccount.google.com/apppasswords\n' +
          '2. Generate a new App Password for "Mail"\n' +
          '3. Use that 16-character password (no spaces) instead of your regular password\n\n' +
          'Note: You need 2-Factor Authentication enabled first.'
        );
      } else {
        console.error('Failed to fetch folders:', errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();

    if (accounts.length === 0) {
      console.warn('No email account available for import');
      return;
    }

    const selectedFolderNames = Object.keys(selectedFolders).filter(f => selectedFolders[f]);

    if (selectedFolderNames.length === 0) {
      console.warn('No folders selected for import');
      return;
    }

    const sessionId = `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let eventSource = null;
    let importCompleted = false;

    try {
      setShowImportDialog(false);
      setCurrentSessionId(sessionId); // Store session ID for stop button
      setImportProgress({
        isImporting: true,
        currentFolder: '',
        currentFolderIndex: 0,
        totalFolders: selectedFolderNames.length,
        totalImported: 0,
        totalSkipped: 0,
        folderResults: [],
        logs: []
      });

      // Connect to SSE endpoint for real-time logs
      eventSource = new EventSource(`/api/messages/import/progress/${sessionId}`, { withCredentials: true });

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'connected') {
          console.log('SSE connected:', data.sessionId);
        } else if (data.type === 'log') {
          // Add log to the list
          setImportProgress(prev => ({
            ...prev,
            logs: [...prev.logs, { level: data.level, message: data.message, timestamp: data.timestamp }]
          }));
        } else if (data.type === 'complete') {
          // Import finished - update final results
          console.log('Import completed via SSE:', data);
          importCompleted = true;

          // Close SSE connection
          eventSource?.close();

          if (data.error) {
            // Import failed
            console.error('Import failed:', data.error);
            setCurrentSessionId(null);
            setImportProgress({
              isImporting: false,
              currentFolder: '',
              currentFolderIndex: 0,
              totalFolders: 0,
              totalImported: 0,
              totalSkipped: 0,
              folderResults: [],
              logs: []
            });
          } else if (data.results) {
            // Import succeeded
            setImportProgress(prev => ({
              ...prev,
              totalImported: data.results.totalImported,
              totalSkipped: data.results.totalSkipped,
              folderResults: data.results.folders
            }));

            // Refresh message list
            messagesAPI.getAll().then(messagesRes => {
              setMessages(messagesRes.data.messages);
              setFilteredMessages(messagesRes.data.messages);
            });

            // Reset for next import
            setImportStep(1);
            setAvailableFolders([]);
            setSelectedFolders({});

            // Clear progress after showing final results
            setTimeout(() => {
              setCurrentSessionId(null);
              setImportProgress({
                isImporting: false,
                currentFolder: '',
                currentFolderIndex: 0,
                totalFolders: 0,
                totalImported: 0,
                totalSkipped: 0,
                folderResults: [],
                logs: []
              });
            }, 5000);
          }
        }
      };

      eventSource.onerror = (error) => {
        const wasCompleted = importCompleted;
        console.log(wasCompleted ? 'SSE connection closed normally after import completion' : 'SSE connection error or unexpected closure:', error);
        eventSource?.close();

        // Only show error if import didn't complete successfully
        if (!wasCompleted) {
          console.error('Connection to import progress lost. Import may still be running in the background.');
          setCurrentSessionId(null);
          setImportProgress({
            isImporting: false,
            currentFolder: '',
            currentFolderIndex: 0,
            totalFolders: 0,
            totalImported: 0,
            totalSkipped: 0,
            folderResults: [],
            logs: []
          });
        }
      };

      // Start the actual import (returns immediately with 202)
      await messagesAPI.importMulti({
        account_id: accounts[0].id,
        imap_host: importData.imap_host,
        imap_port: importData.imap_port,
        imap_username: importData.imap_username,
        imap_password: importData.imap_password,
        folders: selectedFolderNames,
        session_id: sessionId
      });

      console.log('Import started, waiting for completion via SSE...');

    } catch (error) {
      eventSource?.close();
      const errorMsg = error.response?.data?.error || error.message;
      console.error('Import failed:', errorMsg);
      setImportStep(1);
      setCurrentSessionId(null);
      setImportProgress({
        isImporting: false,
        currentFolder: '',
        currentFolderIndex: 0,
        totalFolders: 0,
        totalImported: 0,
        totalSkipped: 0,
        folderResults: [],
        logs: []
      });
    }
  };

  const handleStopImport = async () => {
    if (!currentSessionId) {
      console.warn('No active import session');
      return;
    }

    if (!confirm('Stop the import? Progress will be saved for messages already imported.')) {
      return;
    }

    try {
      console.log(`Stopping import session: ${currentSessionId}`);
      const response = await messagesAPI.stopImport(currentSessionId);
      console.log('Stop request sent:', response.data);
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      console.error('Failed to stop import:', errorMsg);
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
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {selectedMessageIds.size > 0 && (
            <button
              style={{ ...styles.button, backgroundColor: '#dc3545' }}
              onClick={handleDeleteSelected}
            >
              🗑️ Delete ({selectedMessageIds.size})
            </button>
          )}
          <span style={{ marginRight: '0.5rem' }}>{user?.email}</span>
          <button style={styles.button} onClick={handleSync}>Sync</button>
          <button style={styles.button} onClick={() => setShowImportDialog(true)}>Import from Gmail</button>
          <button style={styles.button} onClick={() => window.location.href = '/compose'}>Compose</button>
          <button style={styles.button} onClick={() => window.location.href = '/settings'}>Settings</button>
          <button style={styles.button} onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div style={styles.main}>
        <aside style={styles.sidebar}>
          <input
            type="text"
            placeholder="🔍 Search messages..."
            value={searchQuery}
            onChange={handleSearch}
            style={styles.searchInputSidebar}
          />

          {/* Folder List */}
          <div style={styles.folderSection}>
            <div style={styles.folderHeader}>Folders</div>
            <ul style={styles.folderList}>
              {folders.map(folder => {
                const folderCount = folder === 'All'
                  ? filteredMessages.length
                  : filteredMessages.filter(msg => msg.folder === folder).length;
                return (
                  <li
                    key={folder}
                    style={{
                      ...styles.folderItem,
                      ...(selectedFolder === folder ? styles.folderItemActive : {})
                    }}
                    onClick={() => {
                      setSelectedFolder(folder);
                      setCurrentPage(1);
                      setSelectedMessage(null); // Clear selection when switching folders
                    }}
                  >
                    <span style={styles.folderName}>
                      {folder === 'All' ? '📁 All Messages' : `📂 ${folder}`}
                    </span>
                    <span style={styles.folderCount}>{folderCount}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        <main style={styles.content}>
          {selectedMessage ? (
            /* Message Detail View */
            <div style={{ padding: '2rem' }}>
              <div style={styles.messageViewHeader}>
                <button
                  style={{ ...styles.button, marginRight: '1rem' }}
                  onClick={() => setSelectedMessage(null)}
                >
                  ← Back to List
                </button>
                <h2 style={{ margin: 0, flex: 1 }}>{selectedMessage.subject}</h2>
                <button
                  style={{ ...styles.button, backgroundColor: '#dc3545' }}
                  onClick={() => {
                    handleDeleteMessage(selectedMessage.id);
                    setSelectedMessage(null);
                  }}
                >
                  🗑️ Delete
                </button>
              </div>
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
            /* Message List View */
            <div>
              <div style={styles.messageListHeader}>
                <div style={styles.messageListHeaderLeft}>
                  <label style={styles.selectAllLabel}>
                    <input
                      type="checkbox"
                      checked={paginatedMessages.length > 0 && selectedMessageIds.size === paginatedMessages.length && paginatedMessages.every(msg => selectedMessageIds.has(msg.id))}
                      onChange={toggleSelectAll}
                      style={styles.checkbox}
                    />
                    <span>
                      {selectedMessageIds.size > 0
                        ? `${selectedMessageIds.size} selected`
                        : `${folderFilteredMessages.length} message${folderFilteredMessages.length !== 1 ? 's' : ''}`}
                    </span>
                  </label>
                  {selectedMessageIds.size > 0 && (
                    <button
                      style={{ ...styles.button, backgroundColor: '#dc3545', marginLeft: '1rem' }}
                      onClick={handleDeleteSelected}
                    >
                      🗑️ Delete ({selectedMessageIds.size})
                    </button>
                  )}
                </div>
                <div style={styles.messageListHeaderRight}>
                  {totalPages > 1 && (
                    <div style={styles.paginationInline}>
                      <span style={styles.paginationInfo}>
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        style={{
                          ...styles.paginationButton,
                          ...(currentPage === 1 ? styles.paginationButtonDisabled : {})
                        }}
                      >
                        ←
                      </button>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        style={{
                          ...styles.paginationButton,
                          ...(currentPage === totalPages ? styles.paginationButtonDisabled : {})
                        }}
                      >
                        →
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {paginatedMessages.length === 0 ? (
                <div style={styles.emptyMessage}>
                  <p>{searchQuery ? 'No messages match your search' : 'No messages in this folder. Click Sync to fetch emails.'}</p>
                </div>
              ) : (
                <ul style={styles.messageListMain}>
                  {paginatedMessages.map(msg => (
                    <li
                      key={msg.id}
                      style={{
                        ...styles.messageItemMain,
                        ...(msg.is_read ? {} : styles.unread)
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = msg.is_read ? 'white' : '#f0f8ff'}
                    >
                      <input
                        type="checkbox"
                        checked={selectedMessageIds.has(msg.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelectMessage(msg.id);
                        }}
                        style={styles.messageCheckbox}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div style={styles.messageContentMain} onClick={() => selectMessage(msg)}>
                        <div style={styles.messageFromMain}>{msg.from_address}</div>
                        <div style={styles.messageSubjectMain}>{msg.subject}</div>
                        <div style={styles.messageDateMain}>
                          {new Date(msg.received_date).toLocaleDateString()}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Import Dialog */}
      {showImportDialog && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h2>Import from Gmail - Step {importStep} of 2</h2>

            {importStep === 1 ? (
              <>
                <div style={styles.warningBox}>
                  <strong>⚠️ Gmail App Password Required</strong><br />
                  Gmail requires an App Password (not your regular password).<br />
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.link}
                  >
                    Click here to generate an App Password →
                  </a>
                </div>
                <form onSubmit={handleFetchFolders}>
                  <div style={styles.formGroup}>
                    <label>IMAP Host:</label>
                    <input
                      type="text"
                      value={importData.imap_host}
                      onChange={(e) => setImportData({ ...importData, imap_host: e.target.value })}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label>Port:</label>
                    <input
                      type="number"
                      value={importData.imap_port}
                      onChange={(e) => setImportData({ ...importData, imap_port: parseInt(e.target.value) })}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label>Gmail Address:</label>
                    <input
                      type="email"
                      value={importData.imap_username}
                      onChange={(e) => setImportData({ ...importData, imap_username: e.target.value })}
                      placeholder="your-email@gmail.com"
                      required
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label>App Password:</label>
                    <input
                      type="password"
                      value={importData.imap_password}
                      onChange={(e) => setImportData({ ...importData, imap_password: e.target.value })}
                      placeholder="16-character app password"
                      required
                      style={styles.input}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowImportDialog(false);
                        setImportStep(1);
                      }}
                      style={styles.button}
                    >
                      Cancel
                    </button>
                    <button type="submit" style={{ ...styles.button, backgroundColor: '#667eea' }} disabled={loading}>
                      {loading ? 'Connecting...' : 'Next: Select Folders →'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div style={styles.infoBox}>
                  <strong>📁 Found {availableFolders.length} folders</strong><br />
                  Select the folders you want to import. All emails will be imported from each selected folder, processing in batches of 10 messages for better progress tracking.
                </div>
                <form onSubmit={handleImport}>
                  <div style={styles.folderList}>
                    <div style={styles.folderControls}>
                      <button
                        type="button"
                        onClick={() => {
                          const all = {};
                          availableFolders.forEach(f => all[f.name] = true);
                          setSelectedFolders(all);
                        }}
                        style={styles.smallButton}
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedFolders({})}
                        style={styles.smallButton}
                      >
                        Clear All
                      </button>
                    </div>
                    <div style={styles.folderCheckboxes}>
                      {availableFolders.map(folder => (
                        <label key={folder.name} style={styles.folderItem}>
                          <input
                            type="checkbox"
                            checked={selectedFolders[folder.name] || false}
                            onChange={(e) => setSelectedFolders({
                              ...selectedFolders,
                              [folder.name]: e.target.checked
                            })}
                            style={styles.checkbox}
                          />
                          <span>{folder.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => setImportStep(1)}
                      style={styles.button}
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowImportDialog(false);
                        setImportStep(1);
                      }}
                      style={styles.button}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      style={{ ...styles.button, backgroundColor: '#28a745' }}
                      disabled={loading || Object.values(selectedFolders).filter(Boolean).length === 0}
                    >
                      {loading ? 'Importing...' : `Import ${Object.values(selectedFolders).filter(Boolean).length} Folders`}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Import Progress Overlay */}
      {importProgress.isImporting && (
        <div style={styles.overlay}>
          <div style={styles.progressCard}>
            <h2 style={{ margin: '0 0 1.5rem 0' }}>📥 Importing Emails</h2>

            <div style={styles.progressInfo}>
              <div style={styles.progressBar}>
                <div
                  style={{
                    ...styles.progressBarFill,
                    width: `${importProgress.totalFolders > 0 ? (importProgress.folderResults.length / importProgress.totalFolders) * 100 : 0}%`
                  }}
                />
              </div>
              <div style={styles.progressText}>
                Folder {importProgress.folderResults.length} of {importProgress.totalFolders}
              </div>
            </div>

            <div style={styles.statsGrid}>
              <div style={styles.statItem}>
                <div style={styles.statValue}>{importProgress.totalImported}</div>
                <div style={styles.statLabel}>Imported</div>
              </div>
              <div style={styles.statItem}>
                <div style={styles.statValue}>{importProgress.totalSkipped}</div>
                <div style={styles.statLabel}>Skipped</div>
              </div>
              <div style={styles.statItem}>
                <div style={styles.statValue}>{importProgress.folderResults.length}</div>
                <div style={styles.statLabel}>Completed</div>
              </div>
            </div>

            {/* Live Logs Section */}
            {importProgress.logs.length > 0 && (
              <div style={styles.logsSection}>
                <h3 style={{ fontSize: '0.9rem', margin: '0 0 0.5rem 0', color: '#666' }}>Import Logs:</h3>
                <div style={styles.logsContainer} data-logs-container>
                  {importProgress.logs.slice(-20).map((log, index) => (
                    <div key={index} style={styles.logEntry}>
                      <span style={styles.logTimestamp}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span style={{
                        ...styles.logMessage,
                        color: log.level === 'error' ? '#ff6b6b' : log.level === 'success' ? '#51cf66' : '#e9ecef'
                      }}>
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {importProgress.folderResults.length > 0 && (
              <div style={styles.folderResults}>
                <h3 style={{ fontSize: '0.9rem', margin: '0 0 0.5rem 0', color: '#666' }}>Folder Details:</h3>
                <div style={styles.folderResultsList}>
                  {importProgress.folderResults.map((folder, index) => (
                    <div key={index} style={styles.folderResultItem}>
                      <div style={styles.folderResultName}>{folder.name}</div>
                      <div style={styles.folderResultStats}>
                        {folder.error ? (
                          <span style={{ color: '#dc3545' }}>❌ {folder.error}</span>
                        ) : (
                          <>
                            <span style={{ color: '#28a745' }}>✅ {folder.imported} imported</span>
                            {folder.skipped > 0 && (
                              <span style={{ color: '#666', marginLeft: '0.5rem' }}>⏭️ {folder.skipped} skipped</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stop Button */}
            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <button
                onClick={handleStopImport}
                style={{
                  ...styles.button,
                  backgroundColor: '#dc3545',
                  color: 'white',
                  padding: '0.75rem 2rem',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}
              >
                🛑 Stop Import
              </button>
            </div>
          </div>
        </div>
      )}
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
    width: '280px',
    borderRight: '1px solid #ddd',
    overflowY: 'auto',
    padding: '1rem',
    backgroundColor: '#f9f9f9'
  },
  content: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' },
  messageListHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    borderBottom: '2px solid #ddd',
    backgroundColor: '#fff',
    position: 'sticky',
    top: 0,
    zIndex: 10
  },
  messageListHeaderLeft: {
    display: 'flex',
    alignItems: 'center'
  },
  messageListHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  paginationInline: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  messageListMain: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    flex: 1
  },
  messageItemMain: {
    padding: '1rem 2rem',
    borderBottom: '1px solid #eee',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    display: 'flex',
    alignItems: 'flex-start'
  },
  messageContentMain: {
    flex: 1,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  messageFromMain: {
    fontSize: '0.95rem',
    color: '#333',
    minWidth: '250px',
    fontWeight: '500'
  },
  messageSubjectMain: {
    fontSize: '1rem',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  messageDateMain: {
    fontSize: '0.85rem',
    color: '#999',
    minWidth: '120px',
    textAlign: 'right'
  },
  messageList: { listStyle: 'none', padding: 0, margin: 0 },
  messageItem: {
    padding: '0.75rem',
    borderBottom: '1px solid #eee',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    display: 'flex',
    alignItems: 'flex-start'
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
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '80vh',
    overflowY: 'auto'
  },
  modalNote: {
    backgroundColor: '#fff3cd',
    padding: '1rem',
    borderRadius: '4px',
    fontSize: '0.85rem',
    marginBottom: '1rem',
    border: '1px solid #ffc107'
  },
  warningBox: {
    backgroundColor: '#fff3cd',
    padding: '1rem',
    borderRadius: '4px',
    fontSize: '0.9rem',
    marginBottom: '1.5rem',
    border: '2px solid #ff9800',
    lineHeight: '1.6'
  },
  link: {
    color: '#0066cc',
    textDecoration: 'underline',
    fontWeight: '500'
  },
  formGroup: {
    marginBottom: '1rem'
  },
  input: {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
    boxSizing: 'border-box'
  },
  infoBox: {
    backgroundColor: '#e7f3ff',
    padding: '1rem',
    borderRadius: '4px',
    fontSize: '0.9rem',
    marginBottom: '1.5rem',
    border: '2px solid #2196f3',
    lineHeight: '1.6'
  },
  folderList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    maxHeight: '400px',
    overflowY: 'auto'
  },
  folderControls: {
    display: 'flex',
    gap: '10px',
    marginBottom: '1rem',
    paddingBottom: '0.5rem',
    borderBottom: '2px solid #ddd'
  },
  smallButton: {
    padding: '0.4rem 0.8rem',
    fontSize: '0.85rem',
    border: '1px solid #007bff',
    borderRadius: '4px',
    backgroundColor: 'white',
    color: '#007bff',
    cursor: 'pointer',
    fontWeight: '500'
  },
  folderCheckboxes: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  folderItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem',
    cursor: 'pointer',
    borderRadius: '4px',
    transition: 'all 0.2s',
    marginBottom: '0.25rem',
    borderLeft: '4px solid transparent'
  },
  checkbox: {
    marginRight: '0.8rem',
    width: '18px',
    height: '18px',
    cursor: 'pointer'
  },
  searchInputSidebar: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '4px',
    border: '2px solid #ddd',
    fontSize: '0.95rem',
    outline: 'none',
    marginBottom: '1rem',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s'
  },
  sidebarHeader: {
    marginBottom: '1rem',
    paddingBottom: '0.5rem',
    borderBottom: '2px solid #ddd'
  },
  selectAllLabel: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    fontSize: '1.1rem',
    fontWeight: 'bold'
  },
  messageCheckbox: {
    marginRight: '0.75rem',
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    flexShrink: 0
  },
  messageContent: {
    flex: 1,
    cursor: 'pointer'
  },
  messageViewHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem',
    paddingBottom: '1rem',
    borderBottom: '2px solid #eee'
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000
  },
  progressCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '2rem',
    maxWidth: '600px',
    width: '90%',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
  },
  progressInfo: {
    marginBottom: '1.5rem'
  },
  progressBar: {
    width: '100%',
    height: '24px',
    backgroundColor: '#e9ecef',
    borderRadius: '12px',
    overflow: 'hidden',
    marginBottom: '0.5rem'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#28a745',
    transition: 'width 0.3s ease',
    borderRadius: '12px',
    background: 'linear-gradient(90deg, #28a745, #20c997)'
  },
  progressText: {
    textAlign: 'center',
    fontSize: '0.9rem',
    color: '#666',
    fontWeight: '500'
  },
  currentFolder: {
    backgroundColor: '#e3f2fd',
    padding: '0.75rem',
    borderRadius: '6px',
    marginBottom: '1.5rem',
    fontSize: '0.95rem',
    border: '1px solid #2196f3'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1rem',
    marginBottom: '1.5rem'
  },
  statItem: {
    textAlign: 'center',
    padding: '1rem',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px'
  },
  statValue: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: '0.25rem'
  },
  statLabel: {
    fontSize: '0.85rem',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  folderResults: {
    borderTop: '2px solid #eee',
    paddingTop: '1rem'
  },
  folderResultsList: {
    maxHeight: '200px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  folderResultItem: {
    padding: '0.75rem',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
    borderLeft: '4px solid #28a745'
  },
  folderResultName: {
    fontWeight: '600',
    marginBottom: '0.25rem',
    color: '#333'
  },
  folderResultStats: {
    fontSize: '0.85rem',
    color: '#666'
  },
  logsSection: {
    borderTop: '2px solid #eee',
    paddingTop: '1rem',
    marginTop: '1rem'
  },
  logsContainer: {
    maxHeight: '250px',
    overflowY: 'auto',
    backgroundColor: '#1e1e1e',
    borderRadius: '6px',
    padding: '0.75rem',
    fontFamily: 'monospace',
    fontSize: '0.85rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    scrollBehavior: 'smooth'
  },
  logEntry: {
    display: 'flex',
    gap: '0.5rem',
    lineHeight: '1.4',
    padding: '0.25rem 0'
  },
  logTimestamp: {
    color: '#6c757d',
    flexShrink: 0,
    fontSize: '0.75rem',
    minWidth: '80px'
  },
  logMessage: {
    flex: 1,
    wordBreak: 'break-word',
    color: '#e9ecef'
  },
  folderSection: {
    marginBottom: '1.5rem'
  },
  folderHeader: {
    fontSize: '0.85rem',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#666',
    marginBottom: '0.5rem',
    letterSpacing: '0.5px'
  },
  folderItemActive: {
    backgroundColor: '#e3f2fd',
    fontWeight: 'bold',
    borderLeft: '4px solid #2196f3'
  },
  folderName: {
    flex: 1
  },
  folderCount: {
    backgroundColor: '#007bff',
    color: 'white',
    padding: '0.2rem 0.6rem',
    borderRadius: '12px',
    fontSize: '0.8rem',
    fontWeight: 'bold'
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem',
    borderTop: '2px solid #ddd',
    marginTop: '0.5rem',
    backgroundColor: '#f9f9f9'
  },
  paginationButton: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'background-color 0.2s'
  },
  paginationButtonDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
    opacity: 0.6
  },
  paginationInfo: {
    fontSize: '0.9rem',
    fontWeight: '500',
    color: '#333'
  }
};
