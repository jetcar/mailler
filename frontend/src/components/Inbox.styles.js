export const styles = {
    container: { height: '100vh', display: 'flex', flexDirection: 'column' },
    header: {
        backgroundColor: 'var(--accent)',
        color: 'var(--text-on-accent)',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    button: {
        backgroundColor: 'var(--bg-surface)',
        color: 'var(--accent)',
        border: '1px solid rgba(255, 255, 255, 0.45)',
        padding: '0.5rem 1rem',
        margin: '0 0.25rem',
        borderRadius: '8px',
        cursor: 'pointer'
    },
    buttonPrimary: {
        backgroundColor: 'var(--accent)',
        color: 'var(--text-on-accent)',
        border: '1px solid var(--accent)',
        padding: '0.5rem 1rem',
        margin: '0 0.25rem',
        borderRadius: '8px',
        cursor: 'pointer'
    },
    buttonSuccess: {
        backgroundColor: 'var(--success)',
        color: 'var(--text-on-accent)',
        border: '1px solid var(--success)',
        padding: '0.5rem 1rem',
        margin: '0 0.25rem',
        borderRadius: '8px',
        cursor: 'pointer'
    },
    main: { display: 'flex', flex: 1, overflow: 'hidden' },
    sidebar: {
        width: '280px',
        borderRight: '1px solid var(--border-soft)',
        overflowY: 'auto',
        padding: '1rem',
        backgroundColor: 'var(--bg-surface-alt)'
    },
    content: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' },
    modal: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'var(--overlay)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
    },
    modalContent: {
        backgroundColor: 'var(--bg-surface)',
        padding: '2rem',
        borderRadius: '14px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto',
        border: '1px solid var(--border-soft)',
        boxShadow: 'var(--shadow-card)'
    },
    warningBox: {
        backgroundColor: 'var(--bg-warning-soft)',
        padding: '1rem',
        borderRadius: '10px',
        fontSize: '0.9rem',
        marginBottom: '1.5rem',
        border: '1px solid rgba(139, 103, 20, 0.3)',
        lineHeight: '1.6',
        color: 'var(--warning)'
    },
    link: {
        color: 'var(--accent)',
        textDecoration: 'underline',
        fontWeight: '500'
    },
    formGroup: {
        marginBottom: '1rem'
    },
    input: {
        width: '100%',
        padding: '0.5rem',
        border: '1px solid var(--border-soft)',
        borderRadius: '8px',
        fontSize: '1rem',
        boxSizing: 'border-box',
        backgroundColor: 'var(--bg-surface)',
        color: 'var(--text-body)'
    },
    infoBox: {
        backgroundColor: 'var(--bg-info-soft)',
        padding: '1rem',
        borderRadius: '10px',
        fontSize: '0.9rem',
        marginBottom: '1.5rem',
        border: '1px solid rgba(47, 111, 151, 0.22)',
        lineHeight: '1.6',
        color: 'var(--info)'
    },
    folderList: {
        listStyle: 'none',
        padding: 0,
        margin: 0
    },
    folderControls: {
        display: 'flex',
        gap: '10px',
        marginBottom: '1rem',
        paddingBottom: '0.5rem',
        borderBottom: '1px solid var(--border-soft)'
    },
    smallButton: {
        padding: '0.4rem 0.8rem',
        fontSize: '0.85rem',
        border: '1px solid var(--border-soft)',
        borderRadius: '8px',
        backgroundColor: 'var(--bg-surface)',
        color: 'var(--accent)',
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
        borderRadius: '8px',
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
        borderRadius: '8px',
        border: '1px solid var(--border-soft)',
        fontSize: '0.95rem',
        outline: 'none',
        marginBottom: '1rem',
        boxSizing: 'border-box',
        transition: 'border-color 0.2s',
        backgroundColor: 'var(--bg-surface)',
        color: 'var(--text-body)'
    },
    sectionCaption: {
        fontSize: '0.9rem',
        margin: '0 0 0.5rem 0',
        color: 'var(--text-muted)'
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
        backgroundColor: 'var(--bg-surface)',
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
        backgroundColor: 'var(--bg-surface-soft)',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '0.5rem'
    },
    progressBarFill: {
        height: '100%',
        transition: 'width 0.3s ease',
        borderRadius: '12px',
        background: 'linear-gradient(90deg, var(--success), var(--success-bright))'
    },
    progressText: {
        textAlign: 'center',
        fontSize: '0.9rem',
        color: 'var(--text-muted)',
        fontWeight: '500'
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
        backgroundColor: 'var(--bg-surface-alt)',
        borderRadius: '8px',
        border: '1px solid var(--border-soft)'
    },
    statValue: {
        fontSize: '2rem',
        fontWeight: 'bold',
        color: 'var(--accent)',
        marginBottom: '0.25rem'
    },
    statLabel: {
        fontSize: '0.85rem',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    },
    folderResults: {
        borderTop: '1px solid var(--border-soft)',
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
        backgroundColor: 'var(--bg-surface-alt)',
        borderRadius: '6px',
        borderLeft: '4px solid var(--success)'
    },
    folderResultName: {
        fontWeight: '600',
        marginBottom: '0.25rem',
        color: 'var(--text-strong)'
    },
    folderResultStats: {
        fontSize: '0.85rem',
        color: 'var(--text-muted)'
    },
    logsSection: {
        borderTop: '1px solid var(--border-soft)',
        paddingTop: '1rem',
        marginTop: '1rem'
    },
    logsContainer: {
        maxHeight: '250px',
        overflowY: 'auto',
        backgroundColor: 'var(--log-surface)',
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
        color: 'var(--log-timestamp)',
        flexShrink: 0,
        fontSize: '0.75rem',
        minWidth: '80px'
    },
    logMessage: {
        flex: 1,
        wordBreak: 'break-word',
        color: 'var(--log-text)'
    },
    folderSection: {
        marginBottom: '1.5rem'
    },
    folderHeader: {
        fontSize: '0.85rem',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        marginBottom: '0.5rem',
        letterSpacing: '0.5px'
    },
    folderItemActive: {
        backgroundColor: 'var(--bg-accent-soft)',
        fontWeight: 'bold',
        borderLeft: '4px solid var(--accent)'
    },
    folderName: {
        flex: 1
    },
    folderCount: {
        backgroundColor: 'var(--accent)',
        color: 'var(--text-on-accent)',
        padding: '0.2rem 0.6rem',
        borderRadius: '12px',
        fontSize: '0.8rem',
        fontWeight: 'bold'
    }
};