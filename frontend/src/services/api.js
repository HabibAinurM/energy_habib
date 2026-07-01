//api.js
import axios from 'axios';

//const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3006';

const API_BASE = window.location.origin;


const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const res = await axios.post(`${API_BASE}/api/auth/refresh`, { refresh });
          localStorage.setItem('access_token', res.data.access);
          api.defaults.headers.Authorization = `Bearer ${res.data.access}`;
          return api(original);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login:   (username, password) => axios.post(`${API_BASE}/api/auth/login`, { username, password }),
  refresh: (refresh)             => axios.post(`${API_BASE}/api/auth/refresh`, { refresh }),
  me:      ()                    => api.get('/auth/me'),
};

export const dashboardAPI = {
  getSummary: () => api.get('/dashboard'),
};

export const sensorAPI = {
  postData:     (data)          => axios.post(`${API_BASE}/api/sensor-data`, data),
  getLatest:    ()              => api.get('/sensor-data/realtime'),
  getHistory:   (hours = 24)   => api.get(`/sensor-data/history?hours=${hours}`),
  getHourlyStats: (hours = 24) => api.get(`/sensor-data/hourly-stats?hours=${hours}`),
};

export const tarifAPI = {
  getAll:    ()           => api.get('/tarif'),
  getActive: ()           => api.get('/tarif/active'),
  create:    (data)       => api.post('/tarif', data),
  update:    (id, data)   => api.put(`/tarif/${id}`, data),
  delete:    (id)         => api.delete(`/tarif/${id}`),
};

export const alertAPI = {
  getAll:        () => api.get('/alerts'),
  getUnread:     () => api.get('/alerts/unread'),
  markRead:      (id) => api.patch(`/alerts/${id}/mark-read`),
  markAllRead:   () => api.post('/alerts/mark-all-read'),
};

export const energyAPI = {
  getDailyRange: (days = 30) => api.get(`/energi-harian/range?days=${days}`),
};

export const prediksiAPI = {
  getLatest:     ()           => api.get('/prediksi/latest'),
  generate:      ()           => api.post('/prediksi/generate'),
  getComparison: (days = 30)  => api.get(`/prediksi/comparison?days=${days}`),
};

export const settingsAPI = {
  get:    ()      => api.get('/settings'),
  update: (data)  => api.put('/settings', data),
};

export const userAPI = {
  getAll: ()      => api.get('/users'),
  create: (data)  => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id)    => api.delete(`/users/${id}`),
};

export const devAPI = {
  generateSampleData: () => api.get('/generate-sample-data'),
};

export default api;
