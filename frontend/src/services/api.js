import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: true
});

// Request interceptor - log outgoing requests
api.interceptors.request.use(
  (config) => {
    const timestamp = new Date().toISOString();
    console.log(`\n🔵 [${timestamp}] API Request`);
    console.log(`   Method: ${config.method.toUpperCase()}`);
    console.log(`   URL: ${config.baseURL}${config.url}`);

    if (config.params && Object.keys(config.params).length > 0) {
      console.log(`   Params:`, config.params);
    }

    if (config.data) {
      console.log(`   Data:`, config.data);
    }

    if (config.headers) {
      console.log(`   Headers:`, {
        'Content-Type': config.headers['Content-Type'],
        'Accept': config.headers['Accept']
      });
    }

    // Store request start time for duration calculation
    config.metadata = { startTime: Date.now() };

    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - log responses and errors
api.interceptors.response.use(
  (response) => {
    const timestamp = new Date().toISOString();
    const duration = Date.now() - response.config.metadata.startTime;

    console.log(`\n✅ [${timestamp}] API Response`);
    console.log(`   Method: ${response.config.method.toUpperCase()}`);
    console.log(`   URL: ${response.config.url}`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Duration: ${duration}ms`);

    if (response.data) {
      console.log(`   Data:`, response.data);
    }

    return response;
  },
  (error) => {
    const timestamp = new Date().toISOString();

    if (error.response) {
      // Server responded with error status
      const duration = error.config?.metadata?.startTime
        ? Date.now() - error.config.metadata.startTime
        : 0;

      console.error(`\n❌ [${timestamp}] API Error Response`);
      console.error(`   Method: ${error.config.method.toUpperCase()}`);
      console.error(`   URL: ${error.config.url}`);
      console.error(`   Status: ${error.response.status} ${error.response.statusText}`);
      console.error(`   Duration: ${duration}ms`);
      console.error(`   Error Data:`, error.response.data);

      // Redirect to login page on 401 Unauthorized
      if (error.response.status === 401) {
        console.warn('⚠️  Unauthorized - redirecting to login page');
        // Only redirect if not already on login page
        if (!window.location.pathname.includes('/auth/login') && window.location.pathname !== '/') {
          window.location.href = '/';
        }
      }
    } else if (error.request) {
      // Request made but no response
      console.error(`\n❌ [${timestamp}] No Response`);
      console.error(`   URL: ${error.config?.url}`);
      console.error(`   Error:`, error.message);
    } else {
      // Something else happened
      console.error(`\n❌ [${timestamp}] Request Setup Error`);
      console.error(`   Error:`, error.message);
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  getMe: () => api.get('/auth/me'),
  login: () => {
    window.location.href = '/auth/login';
  },
  logout: () => api.get('/auth/logout')
};

export const accountsAPI = {
  getAll: () => api.get('/api/accounts'),
  get: (id) => api.get(`/api/accounts/${id}`),
  create: (data) => api.post('/api/accounts', data),
  update: (id, data) => api.put(`/api/accounts/${id}`, data),
  delete: (id) => api.delete(`/api/accounts/${id}`)
};

export const messagesAPI = {
  getAll: (params) => api.get('/api/messages', { params }),
  get: (id) => api.get(`/api/messages/${id}`),
  send: (data) => api.post('/api/messages/send', data),
  sync: (accountId) => api.post('/api/messages/sync', { account_id: accountId }),
  import: (data) => api.post('/api/messages/import', data),
  fetchFolders: (data) => api.post('/api/messages/import/folders', data),
  importMulti: (data) => api.post('/api/messages/import/multi', data),
  stopImport: (sessionId) => api.post(`/api/messages/import/stop/${sessionId}`),
  update: (id, data) => api.patch(`/api/messages/${id}`, data),
  delete: (id) => api.delete(`/api/messages/${id}`)
};

export default api;
