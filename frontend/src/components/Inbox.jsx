import React, { useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate, useSearchParams } from 'react-router-dom';
import { messagesAPI, accountsAPI, authAPI } from '../services/api';
import { logger } from '../utils/logger';
import ImportDialog from './ImportDialog';
import ImportProgressOverlay from './ImportProgressOverlay';
import { styles } from './Inbox.styles';

function createInitialImportProgress() {
  return {
    isImporting: false,
    currentFolder: '',
    currentFolderIndex: 0,
    totalFolders: 0,
    totalImported: 0,
    totalSkipped: 0,
    folderResults: [],
    logs: []
  };
}

export default function Inbox() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const logsContainerRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [user, setUser] = useState(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [importStep, setImportStep] = useState(1);
  const [availableFolders, setAvailableFolders] = useState([]);
  const [selectedFolders, setSelectedFolders] = useState({});
  const [importData, setImportData] = useState({
    imap_host: 'imap.gmail.com',
    imap_port: 993,
    imap_username: '',
    imap_password: ''
  });
  const [importProgress, setImportProgress] = useState(createInitialImportProgress);
  const [selectedFolder, setSelectedFolder] = useState(searchParams.get('folder') || 'All');
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page'), 10) || 1);
  const [itemsPerPage] = useState(50);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isImportActionPending, setIsImportActionPending] = useState(false);

  useEffect(() => {
    void init();
  }, []);

  useEffect(() => {
    if (importProgress.logs.length > 0 && logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [importProgress.logs]);

  useEffect(() => {
    const urlFolder = searchParams.get('folder') || 'All';
    const urlPage = parseInt(searchParams.get('page'), 10) || 1;

    if (urlFolder !== selectedFolder) {
      setSelectedFolder(urlFolder);
    }

    if (urlPage !== currentPage) {
      setCurrentPage(urlPage);
    }
  }, [currentPage, searchParams, selectedFolder]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMessages(messages);
      return;
    }

    const query = searchQuery.toLowerCase();
    const nextMessages = messages.filter((message) => (
      message.subject?.toLowerCase().includes(query)
      || message.from_address?.toLowerCase().includes(query)
      || message.body_text?.toLowerCase().includes(query)
    ));
    setFilteredMessages(nextMessages);
  }, [messages, searchQuery]);

  const folders = ['All', ...new Set(messages.map((message) => message.folder).filter(Boolean))];

  async function refreshMessages() {
    const response = await messagesAPI.getAll();
    setMessages(response.data.messages);
    setFilteredMessages(response.data.messages);
  }

  function resetImportProgress() {
    setImportProgress(createInitialImportProgress());
  }

  async function init() {
    const maxRetries = 10;
    const initialDelay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
      try {
        const authRes = await authAPI.getMe();
        if (!authRes.data.authenticated) {
          navigate('/', { replace: true });
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
        return;
      } catch (error) {
        const is503 = error.response?.status === 503;
        const isNetworkError = !error.response && error.message?.includes('Network Error');

        if ((is503 || isNetworkError) && attempt < maxRetries) {
          const delay = initialDelay * Math.pow(2, attempt - 1);
          logger.warn(`Backend not ready (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        if (attempt === maxRetries) {
          logger.error('Failed to load inbox after maximum retries', { error });
          logger.error('Unable to connect to server. Please refresh the page to try again.');
        } else {
          logger.error('Failed to load inbox', { error });
        }

        return;
      }
    }
  }

  function handleSearch(event) {
    setSearchQuery(event.target.value);
  }

  function openFolder(folder) {
    const params = new URLSearchParams();

    if (folder !== 'All') {
      params.set('folder', folder);
    }

    navigate(`/inbox${params.toString() ? `?${params.toString()}` : ''}`);
  }

  async function handleDeleteSelected(ids) {
    try {
      await Promise.all(ids.map((id) => messagesAPI.delete(id)));
      await refreshMessages();
    } catch (error) {
      logger.error('Failed to delete messages', { error: error.response?.data?.error || error.message });
    }
  }

  async function handleDeleteMessage(messageId) {
    try {
      await messagesAPI.delete(messageId);
      await refreshMessages();
    } catch (error) {
      logger.error('Failed to delete message', { error: error.response?.data?.error || error.message });
    }
  }

  async function handleSync() {
    if (accounts.length === 0) {
      return;
    }

    try {
      await messagesAPI.sync(accounts[0].id);
      await refreshMessages();
    } catch (error) {
      logger.error('Sync failed', { error });
    }
  }

  async function handleFetchFolders(event) {
    event.preventDefault();

    if (!importData.imap_username || !importData.imap_password) {
      logger.warn('IMAP credentials required for folder fetch');
      return;
    }

    try {
      setIsImportActionPending(true);
      const response = await messagesAPI.fetchFolders({
        imap_host: importData.imap_host,
        imap_port: importData.imap_port,
        imap_username: importData.imap_username,
        imap_password: importData.imap_password
      });

      setAvailableFolders(response.data.folders);

      const nextSelectedFolders = {};
      response.data.folders.forEach((folder) => {
        const name = folder.name.toLowerCase();
        if (name === 'inbox' || name === '[gmail]/all mail' || name.includes('sent')) {
          nextSelectedFolders[folder.name] = true;
        }
      });

      setSelectedFolders(nextSelectedFolders);
      setImportStep(2);
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message;

      if (errorMsg.includes('Application-specific password')) {
        logger.error(
          '⚠️ Gmail requires an App Password for IMAP access.\n\n'
          + 'Steps to fix:\n'
          + '1. Go to: https://myaccount.google.com/apppasswords\n'
          + '2. Generate a new App Password for "Mail"\n'
          + '3. Use that 16-character password (no spaces) instead of your regular password\n\n'
          + 'Note: You need 2-Factor Authentication enabled first.'
        );
      } else {
        logger.error('Failed to fetch folders', { error: errorMsg });
      }
    } finally {
      setIsImportActionPending(false);
    }
  }

  async function handleImport(event) {
    event.preventDefault();

    if (accounts.length === 0) {
      logger.warn('No email account available for import');
      return;
    }

    const selectedFolderNames = Object.keys(selectedFolders).filter((folder) => selectedFolders[folder]);

    if (selectedFolderNames.length === 0) {
      logger.warn('No folders selected for import');
      return;
    }

    const sessionId = `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let eventSource = null;
    let importCompleted = false;

    try {
      setIsImportActionPending(true);
      setShowImportDialog(false);
      setCurrentSessionId(sessionId);
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

      eventSource = new EventSource(`/api/messages/import/progress/${sessionId}`, { withCredentials: true });

      eventSource.onmessage = (messageEvent) => {
        const data = JSON.parse(messageEvent.data);

        if (data.type === 'connected') {
          logger.info('Import progress stream connected', { sessionId: data.sessionId });
          return;
        }

        if (data.type === 'log') {
          setImportProgress((prev) => ({
            ...prev,
            logs: [...prev.logs, { level: data.level, message: data.message, timestamp: data.timestamp }]
          }));
          return;
        }

        if (data.type !== 'complete') {
          return;
        }

        logger.info('Import completed via SSE', { sessionId: data.sessionId });
        importCompleted = true;
        eventSource?.close();

        if (data.error) {
          logger.error('Import failed', { error: data.error });
          setCurrentSessionId(null);
          resetImportProgress();
          return;
        }

        if (data.results) {
          setImportProgress((prev) => ({
            ...prev,
            totalImported: data.results.totalImported,
            totalSkipped: data.results.totalSkipped,
            folderResults: data.results.folders
          }));

          void refreshMessages();
          setImportStep(1);
          setAvailableFolders([]);
          setSelectedFolders({});

          setTimeout(() => {
            setCurrentSessionId(null);
            resetImportProgress();
          }, 5000);
        }
      };

      eventSource.onerror = (error) => {
        logger.info(
          importCompleted ? 'SSE connection closed after import completion' : 'SSE connection closed unexpectedly',
          importCompleted ? undefined : { error }
        );
        eventSource?.close();

        if (!importCompleted) {
          logger.error('Connection to import progress lost. Import may still be running in the background.');
          setCurrentSessionId(null);
          resetImportProgress();
        }
      };

      await messagesAPI.importMulti({
        account_id: accounts[0].id,
        imap_host: importData.imap_host,
        imap_port: importData.imap_port,
        imap_username: importData.imap_username,
        imap_password: importData.imap_password,
        folders: selectedFolderNames,
        session_id: sessionId
      });

      logger.info('Import started, waiting for SSE completion', { sessionId });
      setIsImportActionPending(false);
    } catch (error) {
      eventSource?.close();
      logger.error('Import failed', { error: error.response?.data?.error || error.message });
      setImportStep(1);
      setCurrentSessionId(null);
      resetImportProgress();
      setIsImportActionPending(false);
    }
  }

  function handleCloseImportDialog() {
    setShowImportDialog(false);
    setImportStep(1);
  }

  async function handleStopImport() {
    if (!currentSessionId) {
      logger.warn('No active import session');
      return;
    }

    if (!confirm('Stop the import? Progress will be saved for messages already imported.')) {
      return;
    }

    try {
      const response = await messagesAPI.stopImport(currentSessionId);
      logger.info('Stop request sent for import session', {
        sessionId: currentSessionId,
        response: response.data
      });
    } catch (error) {
      logger.error('Failed to stop import', { error: error.response?.data?.message || error.message });
    }
  }

  async function handleLogout() {
    try {
      await authAPI.logout();
      navigate('/', { replace: true });
    } catch (error) {
      logger.error('Logout failed', { error });
    }
  }

  function handleMarkRead(messageId) {
    messagesAPI.update(messageId, { is_read: true }).catch(() => { });
    setMessages((prev) => prev.map((message) => (message.id === messageId ? { ...message, is_read: true } : message)));
    setFilteredMessages((prev) => prev.map((message) => (message.id === messageId ? { ...message, is_read: true } : message)));
  }

  const outletContext = {
    messages,
    filteredMessages,
    accounts,
    selectedFolder,
    currentPage,
    itemsPerPage,
    searchQuery,
    onDeleteSelected: handleDeleteSelected,
    onDeleteMessage: handleDeleteMessage,
    onMarkRead: handleMarkRead
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1>📧 Mailler</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ marginRight: '0.5rem' }}>{user?.email}</span>
          <button style={styles.button} onClick={handleSync}>Sync</button>
          <button style={styles.button} onClick={() => setShowImportDialog(true)}>Import from Gmail</button>
          <button style={styles.button} onClick={() => navigate('/compose')}>Compose</button>
          <button style={styles.button} onClick={() => navigate('/settings')}>Settings</button>
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

          <div style={styles.folderSection}>
            <div style={styles.folderHeader}>Folders</div>
            <ul style={styles.folderList}>
              {folders.map((folder) => {
                const folderCount = folder === 'All'
                  ? filteredMessages.length
                  : filteredMessages.filter((message) => message.folder === folder).length;

                return (
                  <li
                    key={folder}
                    style={{
                      ...styles.folderItem,
                      ...(selectedFolder === folder ? styles.folderItemActive : {})
                    }}
                    onClick={() => openFolder(folder)}
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
          <Outlet context={outletContext} />
        </main>
      </div>

      {showImportDialog && (
        <ImportDialog
          importStep={importStep}
          importData={importData}
          setImportData={setImportData}
          availableFolders={availableFolders}
          selectedFolders={selectedFolders}
          setSelectedFolders={setSelectedFolders}
          isImportActionPending={isImportActionPending}
          onClose={handleCloseImportDialog}
          onBack={() => setImportStep(1)}
          onFetchFolders={handleFetchFolders}
          onImport={handleImport}
        />
      )}

      <ImportProgressOverlay
        importProgress={importProgress}
        logsContainerRef={logsContainerRef}
        onStopImport={handleStopImport}
      />
    </div>
  );
}
