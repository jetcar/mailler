import React from 'react';
import { styles } from './Inbox.styles';

export default function ImportDialog({
    importStep,
    importData,
    setImportData,
    availableFolders,
    selectedFolders,
    setSelectedFolders,
    importError,
    isImportActionPending,
    onClose,
    onBack,
    onFetchFolders,
    onImport
}) {
    const selectedFolderCount = Object.values(selectedFolders).filter(Boolean).length;

    const handleSelectAllFolders = () => {
        const nextSelection = {};
        availableFolders.forEach((folder) => {
            nextSelection[folder.name] = true;
        });
        setSelectedFolders(nextSelection);
    };

    return (
        <div style={styles.modal}>
            <div style={styles.modalContent}>
                <h2>Import from Gmail - Step {importStep} of 2</h2>

                {importError && (
                    <div style={styles.errorBox}>
                        <strong>Import could not start</strong><br />
                        {importError}
                    </div>
                )}

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

                        <form onSubmit={onFetchFolders}>
                            <div style={styles.formGroup}>
                                <label>IMAP Host:</label>
                                <input
                                    type="text"
                                    value={importData.imap_host}
                                    onChange={(event) => setImportData({ ...importData, imap_host: event.target.value })}
                                    style={styles.input}
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label>Port:</label>
                                <input
                                    type="number"
                                    value={importData.imap_port}
                                    onChange={(event) => setImportData({ ...importData, imap_port: parseInt(event.target.value, 10) })}
                                    style={styles.input}
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label>Gmail Address:</label>
                                <input
                                    type="email"
                                    value={importData.imap_username}
                                    onChange={(event) => setImportData({ ...importData, imap_username: event.target.value })}
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
                                    onChange={(event) => setImportData({ ...importData, imap_password: event.target.value })}
                                    placeholder="16-character app password"
                                    required
                                    style={styles.input}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={onClose} style={styles.button}>
                                    Cancel
                                </button>
                                <button type="submit" style={styles.buttonPrimary} disabled={isImportActionPending}>
                                    {isImportActionPending ? 'Connecting...' : 'Next: Select Folders →'}
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

                        <form onSubmit={onImport}>
                            <div style={styles.folderList}>
                                <div style={styles.folderControls}>
                                    <button type="button" onClick={handleSelectAllFolders} style={styles.smallButton}>
                                        Select All
                                    </button>
                                    <button type="button" onClick={() => setSelectedFolders({})} style={styles.smallButton}>
                                        Clear All
                                    </button>
                                </div>

                                <div style={styles.folderCheckboxes}>
                                    {availableFolders.map((folder) => (
                                        <label key={folder.name} style={styles.folderItem}>
                                            <input
                                                type="checkbox"
                                                checked={selectedFolders[folder.name] || false}
                                                onChange={(event) => setSelectedFolders({
                                                    ...selectedFolders,
                                                    [folder.name]: event.target.checked
                                                })}
                                                style={styles.checkbox}
                                            />
                                            <span>{folder.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                <button type="button" onClick={onBack} style={styles.button}>
                                    ← Back
                                </button>
                                <button type="button" onClick={onClose} style={styles.button}>
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={styles.buttonSuccess}
                                    disabled={isImportActionPending || selectedFolderCount === 0}
                                >
                                    {isImportActionPending ? 'Importing...' : `Import ${selectedFolderCount} Folders`}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}