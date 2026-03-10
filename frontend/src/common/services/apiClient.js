const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

class ApiClient {
  buildUrl(path, params = {}) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${API_BASE_URL}${normalizedPath}`);
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      url.searchParams.append(key, String(value));
    });
    return url.toString();
  }

  getAuthHeader() {
    const token = localStorage.getItem('connectx_token') || localStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async request(method, path, { params = {}, data = undefined } = {}) {
    const response = await fetch(this.buildUrl(path, params), {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });

    const raw = await response.text();
    let parsed = null;
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = raw;
      }
    }

    if (!response.ok) {
      const detail =
        (parsed && typeof parsed === 'object' && (parsed.detail || parsed.message)) ||
        response.statusText ||
        'Request failed';
      throw new Error(String(detail));
    }

    return { data: parsed ?? {} };
  }

  async get(path, params = {}) {
    return this.request('GET', path, { params });
  }

  async post(path, data = {}) {
    return this.request('POST', path, { data });
  }

  async put(path, data = {}) {
    return this.request('PUT', path, { data });
  }

  async patch(path, data = {}) {
    return this.request('PATCH', path, { data });
  }

  async delete(path) {
    return this.request('DELETE', path);
  }
}

export default new ApiClient();
