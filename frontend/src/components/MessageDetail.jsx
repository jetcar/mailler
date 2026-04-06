import React, { useMemo, useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { useParams, useNavigate, useSearchParams, useOutletContext } from 'react-router-dom';
import { messagesAPI } from '../services/api';
import { logger } from '../utils/logger';

export default function MessageDetail() {
    const { messageId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { messages, onDeleteMessage, onMarkRead } = useOutletContext();
    const numericMessageId = Number.parseInt(messageId, 10);
    const [message, setMessage] = useState(() => messages.find(m => m.id === numericMessageId) || null);

    useEffect(() => {
        // Show cached message immediately, then fetch full body
        const cached = messages.find(m => m.id === numericMessageId);
        if (cached) setMessage(cached);

        messagesAPI.get(numericMessageId).then(res => {
            const nextMessage = res.data.message;
            const shouldMarkRead = Boolean(cached && !cached.is_read) || !nextMessage.is_read;

            setMessage(nextMessage);

            if (shouldMarkRead) {
                onMarkRead(numericMessageId);
            }
        }).catch(err => logger.error('Failed to load message', { error: err }));
    }, [messageId, messages, numericMessageId, onMarkRead]);

    const sanitizedBodyHtml = useMemo(() => {
        if (!message?.body_html) {
            return '';
        }

        return DOMPurify.sanitize(message.body_html, {
            USE_PROFILES: { html: true }
        });
    }, [message?.body_html]);

    const handleBack = () => {
        const folder = searchParams.get('folder');
        const page = searchParams.get('page');
        const params = new URLSearchParams();
        if (folder) params.set('folder', folder);
        if (page) params.set('page', page);
        navigate(`/inbox${params.toString() ? '?' + params.toString() : ''}`);
    };

    const handleDelete = async () => {
        if (!confirm('Delete this message?')) return;
        await onDeleteMessage(numericMessageId);
        handleBack();
    };

    if (!message) {
        return <div style={styles.placeholder}>Loading...</div>;
    }

    return (
        <div style={styles.container} className="message-detail">
            <div style={styles.toolbar}>
                <button style={styles.backBtn} onClick={handleBack}>← Back to List</button>
                <button style={styles.deleteBtn} onClick={handleDelete}>🗑️ Delete</button>
            </div>
            <h2 style={styles.subject}>{message.subject}</h2>
            <div style={styles.meta}>
                <div><strong>From:</strong> {message.from_address}</div>
                <div><strong>To:</strong> {message.to_addresses}</div>
                {message.cc_addresses && <div><strong>CC:</strong> {message.cc_addresses}</div>}
                <div><strong>Date:</strong> {new Date(message.received_date).toLocaleString()}</div>
            </div>
            <hr />
            <div style={styles.body}>
                {sanitizedBodyHtml
                    ? <div dangerouslySetInnerHTML={{ __html: sanitizedBodyHtml }} />
                    : <pre style={styles.bodyText}>{message.body_text}</pre>
                }
            </div>
        </div>
    );
}

const styles = {
    container: { padding: '2rem', overflowY: 'auto', height: '100%', boxSizing: 'border-box', backgroundColor: 'var(--bg-app)' },
    toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-soft)' },
    backBtn: { backgroundColor: 'var(--bg-surface)', color: 'var(--accent)', border: '1px solid var(--border-soft)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' },
    deleteBtn: { backgroundColor: 'var(--danger)', color: 'var(--text-on-accent)', border: '1px solid var(--danger)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' },
    subject: { margin: '0 0 1rem 0', fontSize: '1.4rem', color: 'var(--text-strong)' },
    meta: { backgroundColor: 'var(--bg-surface-soft)', padding: '1rem', borderRadius: '12px', marginBottom: '1rem', fontSize: '0.9rem', lineHeight: '1.8', border: '1px solid var(--border-soft)', color: 'var(--text-body)' },
    body: { lineHeight: '1.6', color: 'var(--text-body)' },
    bodyText: { whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: 'var(--text-body)' },
    placeholder: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '1.1rem' }
};
