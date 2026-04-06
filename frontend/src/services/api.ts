import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('renova_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('renova_token');
      localStorage.removeItem('renova_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth
export const authAPI = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  register: (data: { name: string; email: string; password: string; role?: string }) =>
    api.post('/auth/register', data),
};

// Dashboard
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

// Contacts
export const contactsAPI = {
  getAll: (params?: Record<string, string>) => api.get('/contacts', { params }),
  getById: (id: string) => api.get(`/contacts/${id}`),
  create: (data: Partial<Record<string, unknown>>) => api.post('/contacts', data),
  update: (id: string, data: Partial<Record<string, unknown>>) => api.put(`/contacts/${id}`, data),
  delete: (id: string) => api.delete(`/contacts/${id}`),
};

// Companies
export const companiesAPI = {
  getAll: (params?: Record<string, string>) => api.get('/companies', { params }),
  getById: (id: string) => api.get(`/companies/${id}`),
  create: (data: Partial<Record<string, unknown>>) => api.post('/companies', data),
  update: (id: string, data: Partial<Record<string, unknown>>) => api.put(`/companies/${id}`, data),
  delete: (id: string) => api.delete(`/companies/${id}`),
};

// Deals
export const dealsAPI = {
  getAll: (params?: Record<string, string>) => api.get('/deals', { params }),
  getStats: () => api.get('/deals/stats'),
  getById: (id: string) => api.get(`/deals/${id}`),
  create: (data: Partial<Record<string, unknown>>) => api.post('/deals', data),
  update: (id: string, data: Partial<Record<string, unknown>>) => api.put(`/deals/${id}`, data),
  delete: (id: string) => api.delete(`/deals/${id}`),
};

// Activities
export const activitiesAPI = {
  getAll: (params?: Record<string, string>) => api.get('/activities', { params }),
  getById: (id: string) => api.get(`/activities/${id}`),
  create: (data: Partial<Record<string, unknown>>) => api.post('/activities', data),
  update: (id: string, data: Partial<Record<string, unknown>>) => api.put(`/activities/${id}`, data),
  delete: (id: string) => api.delete(`/activities/${id}`),
};
