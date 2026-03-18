/**
 * apiClient.js — Sostituisce @base44/sdk
 * Punta a VITE_API_URL (es: https://api.tuodominio.it)
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ─── Token management ──────────────────────────────────────────────
const getToken = () => localStorage.getItem('auth_token');
const setToken = (token) => localStorage.setItem('auth_token', token);
const removeToken = () => localStorage.removeItem('auth_token');

// ─── Base fetch wrapper ────────────────────────────────────────────
async function request(method, path, body = null, isFormData = false) {
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : null,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw Object.assign(new Error(err.message || 'Request failed'), { status: res.status, data: err });
  }

  if (res.status === 204) return null;
  return res.json();
}

const get = (path) => request('GET', path);
const post = (path, body) => request('POST', path, body);
const patch = (path, body) => request('PATCH', path, body);
const del = (path) => request('DELETE', path);

// ─── Auth ──────────────────────────────────────────────────────────
export const auth = {
  login: async (email, password) => {
    const data = await post('/api/auth/login', { email, password });
    setToken(data.token);
    return data.user;
  },
  me: () => get('/api/auth/me'),
  logout: (redirectUrl) => {
    removeToken();
    window.location.href = redirectUrl || '/login';
  },
  isAuthenticated: () => !!getToken(),
};

// ─── Generic entity factory ────────────────────────────────────────
function entityClient(resource) {
  return {
    list: (sort, limit) => {
      const params = new URLSearchParams();
      if (sort) params.set('sort', sort);
      if (limit) params.set('limit', limit);
      const qs = params.toString();
      return get(`/api/${resource}${qs ? `?${qs}` : ''}`);
    },
    filter: (filters, sort, limit) => {
      const params = new URLSearchParams();
      if (sort) params.set('sort', sort);
      if (limit) params.set('limit', limit);
      Object.entries(filters || {}).forEach(([k, v]) => {
        if (v !== undefined && v !== null) params.set(k, v);
      });
      return get(`/api/${resource}?${params.toString()}`);
    },
    get: (id) => get(`/api/${resource}/${id}`),
    create: (data) => post(`/api/${resource}`, data),
    update: (id, data) => patch(`/api/${resource}/${id}`, data),
    delete: (id) => del(`/api/${resource}/${id}`),
    bulkCreate: (items) => post(`/api/${resource}/bulk`, items),
  };
}

// ─── Entities ──────────────────────────────────────────────────────
export const entities = {
  Task: entityClient('tasks'),
  Board: entityClient('boards'),
  Commission: entityClient('commissions'),
  Comment: entityClient('comments'),
  Project: entityClient('projects'),
  ProjectMessage: entityClient('project-messages'),
  Notification: entityClient('notifications'),
  BoardMember: entityClient('board-members'),
  CustomField: entityClient('custom-fields'),
  AppSettings: {
    list: () => get('/api/settings').then(s => s ? [s] : []),
    update: (_id, data) => request('PUT', '/api/settings', data),
  },
  User: {
    list: () => get('/api/users'),
    update: (id, data) => patch(`/api/users/${id}`, data),
  },
};

// ─── File upload ───────────────────────────────────────────────────
export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return request('POST', '/api/upload', formData, true);
};

// ─── Users ─────────────────────────────────────────────────────────
export const users = {
  inviteUser: (email, role) => post('/api/users/invite', { email, role }),
  updateMe: (data) => patch('/api/auth/me', data),
};

// ─── Functions (backend functions) ────────────────────────────────
export const functions = {
  invoke: (name, payload) => post(`/api/fn/${name}`, payload),
};

// ─── Integrations (LLM, email, ecc.) ──────────────────────────────
export const integrations = {
  Core: {
    SendEmail: (data) => post('/api/integrations/send-email', data),
    InvokeLLM: (data) => post('/api/integrations/llm', data),
  },
};

// ─── Default export — compatibile con base44.entities.X.list() ────
export const api = {
  auth,
  entities,
  users,
  functions,
  integrations,
  uploadFile,
};

export default api;