import React from 'react';
import { styles } from './Inbox.styles';

export default function ImportProgressOverlay({ importProgress, logsContainerRef, onStopImport }) {
    if (!importProgress.isImporting) {
        return null;
    }

    const completedFolders = importProgress.folderResults.length;
    const totalFolders = importProgress.totalFolders;
    const progressPercent = totalFolders > 0 ? (completedFolders / totalFolders) * 100 : 0;

    return (
        <div style={styles.overlay}>
            <div style={styles.progressCard}>
                <h2 style={{ margin: '0 0 1.5rem 0' }}>📥 Importing Emails</h2>

                <div style={styles.progressInfo}>
                    <div style={styles.progressBar}>
                        <div style={{ ...styles.progressBarFill, width: `${progressPercent}%` }} />
                    </div>
                    <div style={styles.progressText}>
                        Folder {completedFolders} of {totalFolders}
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
                        <div style={styles.statValue}>{completedFolders}</div>
                        <div style={styles.statLabel}>Completed</div>
                    </div>
                </div>

                {importProgress.logs.length > 0 && (
                    <div style={styles.logsSection}>
                        <h3 style={styles.sectionCaption}>Import Logs:</h3>
                        <div style={styles.logsContainer} ref={logsContainerRef}>
                            {importProgress.logs.slice(-20).map((log, index) => (
                                <div key={index} style={styles.logEntry}>
                                    <span style={styles.logTimestamp}>
                                        {new Date(log.timestamp).toLocaleTimeString()}
                                    </span>
                                    <span
                                        style={{
                                            ...styles.logMessage,
                                            color: log.level === 'error'
                                                ? 'var(--danger)'
                                                : log.level === 'success'
                                                    ? 'var(--success)'
                                                    : 'var(--bg-surface-soft)'
                                        }}
                                    >
                                        {log.message}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {completedFolders > 0 && (
                    <div style={styles.folderResults}>
                        <h3 style={styles.sectionCaption}>Folder Details:</h3>
                        <div style={styles.folderResultsList}>
                            {importProgress.folderResults.map((folder, index) => (
                                <div key={index} style={styles.folderResultItem}>
                                    <div style={styles.folderResultName}>{folder.name}</div>
                                    <div style={styles.folderResultStats}>
                                        {folder.error ? (
                                            <span style={{ color: 'var(--danger)' }}>❌ {folder.error}</span>
                                        ) : (
                                            <>
                                                <span style={{ color: 'var(--success)' }}>✅ {folder.imported} imported</span>
                                                {folder.skipped > 0 && (
                                                    <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                                                        ⏭️ {folder.skipped} skipped
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    <button
                        onClick={onStopImport}
                        style={{
                            ...styles.button,
                            backgroundColor: 'var(--danger)',
                            color: 'var(--text-on-accent)',
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
    );
}