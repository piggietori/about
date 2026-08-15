async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

const api = {
  getConfig: () => apiFetch('/api/config'),
  saveConfig: (photoDir) => apiFetch('/api/config', { method: 'POST', body: JSON.stringify({ photoDir }) }),
  startIndex: () => apiFetch('/api/index/start', { method: 'POST' }),
  getIndexStatus: () => apiFetch('/api/index/status'),
  getStats: () => apiFetch('/api/photos/stats'),
  getPhoto: (id) => apiFetch(`/api/photos/${id}`),
  search: (query) => apiFetch('/api/search', { method: 'POST', body: JSON.stringify({ query }) }),
};
