/**
 * public/js/api.js — API Layer
 * All communication with the Express + MySQL backend lives here.
 * Automatically attaches auth token from sessionStorage/localStorage.
 */
'use strict';

const API = '/api/items';

function getToken() {
  return sessionStorage.getItem('ql_token') || localStorage.getItem('ql_token') || '';
}

async function apiFetch(url, options = {}) {
  const token = getToken();
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });

  // If 401/403 on a protected page → force logout
  if ((res.status === 401 || res.status === 403) && !url.includes('/api/auth/')) {
    sessionStorage.clear();
    localStorage.removeItem('ql_token');
    localStorage.removeItem('ql_user');
    window.location.href = 'login.html';
    return;
  }

  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

/* GET all items (with optional filters) */
async function apiGetItems({ type = '', status = '', category = '', search = '' } = {}) {
  const p = new URLSearchParams();
  if (type)     p.set('type',     type);
  if (status)   p.set('status',   status);
  if (category) p.set('category', category);
  if (search)   p.set('search',   search);
  const data = await apiFetch(`${API}?${p}`);
  return data.data || [];
}

/* GET stats for home page counters */
async function apiGetStats() {
  const data = await apiFetch(`${API}/stats`);
  return data.data;
}

/* GET single item by id */
async function apiGetItem(id) {
  const data = await apiFetch(`${API}/${id}`);
  return data.data;
}

/* POST create new item */
async function apiCreateItem(fields) {
  return apiFetch(API, { method: 'POST', body: JSON.stringify(fields) });
}

/* PATCH update status */
async function apiUpdateStatus(id, status) {
  return apiFetch(`${API}/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

/* DELETE item */
async function apiDeleteItem(id) {
  return apiFetch(`${API}/${id}`, { method: 'DELETE' });
}
