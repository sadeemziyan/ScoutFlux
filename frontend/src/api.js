const API_URL = import.meta.env.VITE_API_URL

export async function apiFetch(path, token, options = {}) {
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
}