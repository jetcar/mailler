import axios from 'axios';
import { buildAppPath, getApiBaseUrl, isAppPath, routerBasename } from '../config/appPaths';
import { logger } from '../utils/logger';

const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true
});

// Request interceptor - log outgoing requests
api.interceptors.request.use(
  (config) => {
    config.metadata = { startTime: Date.now() };

    logger.debug('API request', {
      method: config.method?.toUpperCase(),
      url: `${config.baseURL || ''}${config.url}`,
      hasParams: Boolean(config.params && Object.keys(config.params).length > 0),
      hasBody: Boolean(config.data)
    });

    return config;
  },
  (error) => {
    logger.error('API request setup failed', { error });
    return Promise.reject(error);
  }
);

// Response interceptor - log responses and errors
api.interceptors.response.use(
  (response) => {
    const duration = Date.now() - response.config.metadata.startTime;

    logger.debug('API response', {
      method: response.config.method?.toUpperCase(),
      url: response.config.url,
      status: response.status,
      duration
    });

    return response;
  },
  (error) => {
    if (error.response) {
      const duration = error.config?.metadata?.startTime
        ? Date.now() - error.config.metadata.startTime
        : 0;

      logger.error('API error response', {
        method: error.config?.method?.toUpperCase(),
        url: error.config?.url,
        status: error.response.status,
        duration,
        data: error.response.data
      });

      if (error.response.status === 401) {
        logger.warn('Unauthorized response received; redirecting to login');
        const authLoginPath = buildAppPath('/auth/login');
        const appLoginPaths = new Set([routerBasename, buildAppPath('/')]);

        if (
          !window.location.pathname.includes(authLoginPath) &&
          !appLoginPaths.has(window.location.pathname) &&
          isAppPath(window.location.pathname)
        ) {
          window.location.assign(routerBasename);
        }
      }
    } else if (error.request) {
      logger.error('API request received no response', {
        url: error.config?.url,
        error: error.message
      });
    } else {
      logger.error('API request failed before sending', { error: error.message });
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  getMe: () => api.get('auth/me'),
  login: () => {
    window.location.assign(buildAppPath('/auth/login'));
  },
  logout: () => api.get('auth/logout')
};

export const accountsAPI = {
  getAll: () => api.get('api/accounts'),
  get: (id) => api.get(`api/accounts/${id}`),
  create: (data) => api.post('api/accounts', data),
  update: (id, data) => api.put(`api/accounts/${id}`, data),
  delete: (id) => api.delete(`api/accounts/${id}`)
};

export const messagesAPI = {
  getAll: (params) => api.get('api/messages', { params }),
  get: (id) => api.get(`api/messages/${id}`),
  send: (data) => api.post('api/messages/send', data),
  sync: (accountId) => api.post('api/messages/sync', { account_id: accountId }),
  import: (data) => api.post('api/messages/import', data),
  fetchFolders: (data) => api.post('api/messages/import/folders', data),
  importMulti: (data) => api.post('api/messages/import/multi', data),
  stopImport: (sessionId) => api.post(`api/messages/import/stop/${sessionId}`),
  update: (id, data) => api.patch(`api/messages/${id}`, data),
  delete: (id) => api.delete(`api/messages/${id}`)
};

export default api;
