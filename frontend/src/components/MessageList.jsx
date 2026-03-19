import React, { useState } from 'react';
import { useOutletContext, useNavigate, useSearchParams } from 'react-router-dom';

export default function MessageList() {
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
        if (!confirm(`Delete ${selectedMessageIds.size} selected message(s)?`)) return;
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
                            style={styles.checkbox}
                        />
                        <span>
                            {selectedMessageIds.size > 0
                                ? `${selectedMessageIds.size} selected`
                                : `${folderFilteredMessages.length} message${folderFilteredMessages.length !== 1 ? 's' : ''}`}
                        </span>
                    </label>
                    {selectedMessageIds.size > 0 && (
                        <button style={{ ...styles.button, backgroundColor: '#dc3545', marginLeft: '1rem' }} onClick={handleDeleteSelected}>
                            🗑️ Delete ({selectedMessageIds.size})
                        </button>
                    )}
                </div>
                {totalPages > 1 && (
                    <div style={styles.pagination}>
                        <span style={styles.pageInfo}>Page {currentPage} of {totalPages}</span>
                        <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} style={{ ...styles.pageBtn, ...(currentPage === 1 ? styles.pageBtnDisabled : {}) }}>←</button>
                        <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} style={{ ...styles.pageBtn, ...(currentPage === totalPages ? styles.pageBtnDisabled : {}) }}>→</button>
                    </div>
                )}
            </div>

            {paginatedMessages.length === 0 ? (
                <div style={styles.empty}>
                    <p>{searchQuery ? 'No messages match your search' : 'No messages in this folder. Click Sync to fetch emails.'}</p>
                </div>
            ) : (
                <ul style={styles.list}>
                    {paginatedMessages.map(msg => (
                        <li
                            key={msg.id}
                            style={{ ...styles.item, ...(msg.is_read ? {} : styles.unread) }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = msg.is_read ? 'white' : '#f0f8ff'}
                        >
                            <input
                                type="checkbox"
                                checked={selectedMessageIds.has(msg.id)}
                                onChange={(e) => { e.stopPropagation(); toggleSelectMessage(msg.id); }}
                                onClick={(e) => e.stopPropagation()}
                                style={styles.checkbox}
                            />
                            <div style={styles.itemContent} onClick={() => openMessage(msg)}>
                                <div style={styles.from}>{msg.from_address}</div>
                                <div style={styles.subject}>{msg.subject}</div>
                                <div style={styles.date}>{new Date(msg.received_date).toLocaleDateString()}</div>
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
        borderBottom: '2px solid #ddd',
        backgroundColor: '#fff',
        position: 'sticky',
        top: 0,
        zIndex: 10
    },
    headerLeft: { display: 'flex', alignItems: 'center' },
    selectAllLabel: { display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 'bold' },
    pagination: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
    pageInfo: { fontSize: '0.9rem', fontWeight: '500', color: '#333' },
    pageBtn: { backgroundColor: '#007bff', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' },
    pageBtnDisabled: { backgroundColor: '#ccc', cursor: 'not-allowed', opacity: 0.6 },
    list: { listStyle: 'none', padding: 0, margin: 0 },
    item: {
        padding: '1rem 2rem',
        borderBottom: '1px solid #eee',
        display: 'flex',
        alignItems: 'flex-start',
        transition: 'background-color 0.2s'
    },
    unread: { fontWeight: 'bold', backgroundColor: '#f0f8ff' },
    checkbox: { marginRight: '0.75rem', width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 },
    itemContent: { flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' },
    from: { fontSize: '0.95rem', color: '#333', minWidth: '250px', fontWeight: '500', pointerEvents: 'none' },
    subject: { fontSize: '1rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', pointerEvents: 'none' },
    date: { fontSize: '0.85rem', color: '#999', minWidth: '120px', textAlign: 'right', pointerEvents: 'none' },
    button: { backgroundColor: 'white', color: '#007bff', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' },
    empty: { display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#999' }
};
