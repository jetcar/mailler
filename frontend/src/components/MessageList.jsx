import React, { useState } from 'react';
import { useOutletContext, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function MessageList() {
    const { i18n, t } = useTranslation();
    const { messages, filteredMessages, accounts, selectedFolder, currentPage, itemsPerPage, onDeleteSelected, onSearch, searchQuery } = useOutletContext();
    const navigate = useNavigate();
    const [, setSearchParams] = useSearchParams();
    const [selectedMessageIds, setSelectedMessageIds] = useState(new Set());

    const folderFilteredMessages = selectedFolder === 'All'
        ? filteredMessages
        : filteredMessages.filter(msg => msg.folder === selectedFolder);

    const totalPages = Math.ceil(folderFilteredMessages.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedMessages = folderFilteredMessages.slice(startIndex, startIndex + itemsPerPage);

    const toggleSelectMessage = (messageId) => {
        setSelectedMessageIds(prev => {
            const next = new Set(prev);
            next.has(messageId) ? next.delete(messageId) : next.add(messageId);
            return next;
        });
    };

    const toggleSelectAll = () => {
        const currentPageIds = paginatedMessages.map(m => m.id);
        const allSelected = currentPageIds.every(id => selectedMessageIds.has(id));
        if (allSelected) {
            setSelectedMessageIds(prev => {
                const next = new Set(prev);
                currentPageIds.forEach(id => next.delete(id));
                return next;
            });
        } else {
            setSelectedMessageIds(prev => new Set([...prev, ...currentPageIds]));
        }
    };

    const handleDeleteSelected = async () => {
        if (!confirm(t('messages.deleteSelectedConfirm', { count: selectedMessageIds.size }))) return;
        await onDeleteSelected(Array.from(selectedMessageIds));
        setSelectedMessageIds(new Set());
    };

    const goToPage = (page) => {
        const params = new URLSearchParams();
        if (selectedFolder && selectedFolder !== 'All') params.set('folder', selectedFolder);
        if (page !== 1) params.set('page', page.toString());
        setSearchParams(params);
    };

    const openMessage = (msg) => {
        const params = new URLSearchParams();
        if (selectedFolder && selectedFolder !== 'All') params.set('folder', selectedFolder);
        if (currentPage !== 1) params.set('page', currentPage.toString());
        navigate(`/inbox/${msg.id}${params.toString() ? '?' + params.toString() : ''}`);
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <label style={styles.selectAllLabel}>
                        <input
                            type="checkbox"
                            checked={paginatedMessages.length > 0 && paginatedMessages.every(msg => selectedMessageIds.has(msg.id))}
                            onChange={toggleSelectAll}
                            aria-label={t('messages.selectAll')}
                            style={styles.checkbox}
                        />
                        <span>
                            {selectedMessageIds.size > 0
                                ? t('messages.selected', { count: selectedMessageIds.size })
                                : t('messages.count', { count: folderFilteredMessages.length })}
                        </span>
                    </label>
                    {selectedMessageIds.size > 0 && (
                        <button style={{ ...styles.buttonDanger, marginLeft: '1rem' }} onClick={handleDeleteSelected}>
                            🗑️ {t('messages.deleteSelected', { count: selectedMessageIds.size })}
                        </button>
                    )}
                </div>
                {totalPages > 1 && (
                    <div style={styles.pagination}>
                        <span style={styles.pageInfo}>{t('messages.page', { current: currentPage, total: totalPages })}</span>
                        <button aria-label={t('messages.previousPage')} onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} style={{ ...styles.pageBtn, ...(currentPage === 1 ? styles.pageBtnDisabled : {}) }}>←</button>
                        <button aria-label={t('messages.nextPage')} onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} style={{ ...styles.pageBtn, ...(currentPage === totalPages ? styles.pageBtnDisabled : {}) }}>→</button>
                    </div>
                )}
            </div>

            {paginatedMessages.length === 0 ? (
                <div style={styles.empty}>
                    <p>{searchQuery ? t('messages.noSearchResults') : t('messages.noFolderMessages')}</p>
                </div>
            ) : (
                <ul style={styles.list}>
                    {paginatedMessages.map(msg => (
                        <li
                            key={msg.id}
                            style={{ ...styles.item, ...(msg.is_read ? {} : styles.unread) }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-soft)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = msg.is_read ? 'var(--bg-surface)' : 'var(--bg-accent-soft)'}
                        >
                            <input
                                type="checkbox"
                                checked={selectedMessageIds.has(msg.id)}
                                onChange={(e) => { e.stopPropagation(); toggleSelectMessage(msg.id); }}
                                onClick={(e) => e.stopPropagation()}
                                aria-label={t('messages.selectMessage', { subject: msg.subject })}
                                style={styles.checkbox}
                            />
                            <div style={styles.itemContent} onClick={() => openMessage(msg)}>
                                <div style={styles.from}>{msg.from_address}</div>
                                <div style={styles.subject}>{msg.subject}</div>
                                <div style={styles.date}>{new Date(msg.received_date).toLocaleDateString(i18n.resolvedLanguage)}</div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

const styles = {
    container: { display: 'flex', flexDirection: 'column', height: '100%' },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 2rem',
        borderBottom: '1px solid var(--border-soft)',
        backgroundColor: 'var(--bg-surface)',
        position: 'sticky',
        top: 0,
        zIndex: 10
    },
    headerLeft: { display: 'flex', alignItems: 'center' },
    selectAllLabel: { display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-strong)' },
    pagination: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
    pageInfo: { fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-body)' },
    pageBtn: { backgroundColor: 'var(--accent)', color: 'var(--text-on-accent)', border: '1px solid var(--accent)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' },
    pageBtnDisabled: { backgroundColor: 'var(--border-strong)', borderColor: 'var(--border-strong)', cursor: 'not-allowed', opacity: 0.7 },
    list: { listStyle: 'none', padding: 0, margin: 0 },
    item: {
        padding: '1rem 2rem',
        borderBottom: '1px solid var(--border-soft)',
        display: 'flex',
        alignItems: 'flex-start',
        transition: 'background-color 0.2s',
        backgroundColor: 'var(--bg-surface)'
    },
    unread: { fontWeight: 'bold', backgroundColor: 'var(--bg-accent-soft)' },
    checkbox: { marginRight: '0.75rem', width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 },
    itemContent: { flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' },
    from: { fontSize: '0.95rem', color: 'var(--text-strong)', minWidth: '250px', fontWeight: '500', pointerEvents: 'none' },
    subject: { fontSize: '1rem', color: 'var(--text-body)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', pointerEvents: 'none' },
    date: { fontSize: '0.85rem', color: 'var(--text-muted)', minWidth: '120px', textAlign: 'right', pointerEvents: 'none' },
    buttonDanger: { backgroundColor: 'var(--danger)', color: 'var(--text-on-accent)', border: '1px solid var(--danger)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' },
    empty: { display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)' }
};
