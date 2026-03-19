const isDebugEnabled = import.meta.env.DEV || import.meta.env.VITE_DEBUG_LOGS === 'true';

function write(method, message, meta) {
    if (meta === undefined) {
        console[method](message);
        return;
    }

    console[method](message, meta);
}

export const logger = {
    debug(message, meta) {
        if (isDebugEnabled) {
            write('debug', message, meta);
        }
    },

    info(message, meta) {
        if (isDebugEnabled) {
            write('info', message, meta);
        }
    },

    warn(message, meta) {
        write('warn', message, meta);
    },

    error(message, meta) {
        write('error', message, meta);
    }
};

export const debugLoggingEnabled = isDebugEnabled;
