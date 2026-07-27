const BASE = '/api/admin';

function getHeaders() {
  const key = localStorage.getItem('admin_key');
  return { 'Content-Type': 'application/json', 'x-admin-key': key || '' };
}

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: getHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    localStorage.removeItem('admin_key');
    window.location.hash = '#/login';
    throw new Error('认证失败');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

export const api = {
  // Dashboard
  getDashboard: () => request('GET', '/dashboard'),

  // Users
  getUsers: (page, limit, search) => request('GET', `/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`),
  getUser: (id) => request('GET', `/users/${id}`),
  updateUserPlan: (id, plan) => request('PUT', `/users/${id}/plan`, { plan }),
  deleteUser: (id) => request('DELETE', `/users/${id}`),

  // Contents
  getContents: (page, limit, search) => request('GET', `/contents?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`),
  deleteContent: (id) => request('DELETE', `/contents/${id}`),

  // Config
  getConfig: () => request('GET', '/config'),
  updateConfig: (data) => request('PUT', '/config', data),
  getAllConfig: () => request('GET', '/config/all'),

  // Whitelabel
  getWhitelabel: () => request('GET', '/whitelabel'),
  updateWhitelabel: (data) => request('PUT', '/whitelabel', data),
};

export function isAuthenticated() {
  return !!localStorage.getItem('admin_key');
}

export async function login(key) {
  // 真正验证密钥：调后端接口，失败则拒绝进入
  const res = await fetch(`${BASE}/dashboard`, {
    headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
  });
  if (!res.ok) {
    throw new Error('密钥无效');
  }
  localStorage.setItem('admin_key', key);
}

export function logout() {
  localStorage.removeItem('admin_key');
  window.location.hash = '#/login';
}
