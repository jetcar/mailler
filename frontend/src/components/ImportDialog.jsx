import React from 'react';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
    const selectedFolderCount = Object.values(selectedFolders).filter(Boolean).length;

    const handleSelectAllFolders = () => {
        const nextSelection = {};
        availableFolders.forEach((folder) => {
            nextSelection[folder.name] = true;
        });
        setSelectedFolders(nextSelection);
    };

    return (
        <div style={styles.modal} role="dialog" aria-modal="true" aria-labelledby="gmail-import-title">
            <div style={styles.modalContent}>
                <h2 id="gmail-import-title">{t('import.title', { step: importStep })}</h2>

                {importError && (
                    <div style={styles.errorBox}>
                        <strong>{t('import.errorTitle')}</strong><br />
                        {importError}
                    </div>
                )}

                {importStep === 1 ? (
                    <>
                        <div style={styles.warningBox}>
                            <strong>⚠️ {t('import.appPasswordTitle')}</strong><br />
                            {t('import.appPasswordHelp')}<br />
                            <a
                                href="https://myaccount.google.com/apppasswords"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={styles.link}
                            >
                                {t('import.appPasswordLink')} →
                            </a>
                        </div>

                        <form onSubmit={onFetchFolders}>
                            <div style={styles.formGroup}>
                                <label>{t('import.imapHost')}</label>
                                <input
                                    type="text"
                                    value={importData.imap_host}
                                    onChange={(event) => setImportData({ ...importData, imap_host: event.target.value })}
                                    style={styles.input}
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label>{t('import.port')}</label>
                                <input
                                    type="number"
                                    value={importData.imap_port}
                                    onChange={(event) => setImportData({ ...importData, imap_port: parseInt(event.target.value, 10) })}
                                    style={styles.input}
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label>{t('import.gmailAddress')}</label>
                                <input
                                    type="email"
                                    value={importData.imap_username}
                                    onChange={(event) => setImportData({ ...importData, imap_username: event.target.value })}
                                    placeholder={t('import.gmailPlaceholder')}
                                    required
                                    style={styles.input}
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label>{t('import.appPassword')}</label>
                                <input
                                    type="password"
                                    value={importData.imap_password}
                                    onChange={(event) => setImportData({ ...importData, imap_password: event.target.value })}
                                    placeholder={t('import.appPasswordPlaceholder')}
                                    required
                                    style={styles.input}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={onClose} style={styles.button}>
                                    {t('common.cancel')}
                                </button>
                                <button type="submit" style={styles.buttonPrimary} disabled={isImportActionPending}>
                                    {isImportActionPending ? t('import.connecting') : `${t('import.next')} →`}
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <>
                        <div style={styles.infoBox}>
                            <strong>📁 {t('import.foundFolders', { count: availableFolders.length })}</strong><br />
                            {t('import.folderHelp')}
                        </div>

                        <form onSubmit={onImport}>
                            <div style={styles.folderList}>
                                <div style={styles.folderControls}>
                                    <button type="button" onClick={handleSelectAllFolders} style={styles.smallButton}>
                                        {t('import.selectAll')}
                                    </button>
                                    <button type="button" onClick={() => setSelectedFolders({})} style={styles.smallButton}>
                                        {t('import.clearAll')}
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
                                    ← {t('common.back')}
                                </button>
                                <button type="button" onClick={onClose} style={styles.button}>
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    style={styles.buttonSuccess}
                                    disabled={isImportActionPending || selectedFolderCount === 0}
                                >
                                    {isImportActionPending ? t('import.importing') : t('import.importFolders', { count: selectedFolderCount })}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
