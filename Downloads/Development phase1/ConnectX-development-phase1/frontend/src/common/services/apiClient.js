const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

class ApiClient {
  buildUrl(url, params = undefined) {
    const raw = String(url || '');
    const isAbsolute = raw.startsWith('http://') || raw.startsWith('https://');
    const normalizedPath = isAbsolute ? raw : `${API_BASE_URL}${raw.startsWith('/') ? raw : `/${raw}`}`;

    if (!params || typeof params !== 'object' || Array.isArray(params)) return normalizedPath;

    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      search.append(key, String(value));
    });
    const qs = search.toString();
    return qs ? `${normalizedPath}${normalizedPath.includes('?') ? '&' : '?'}${qs}` : normalizedPath;
  }

  getToken() {
    return localStorage.getItem('connectx_token') || localStorage.getItem('authToken') || '';
  }

  async request(method, url, data, config = {}) {
    const mergedHeaders = { ...(config.headers || {}) };
    const token = this.getToken();
    if (token) mergedHeaders.Authorization = `Bearer ${token}`;

    const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
    if (data !== undefined && !isFormData && !mergedHeaders['Content-Type']) {
      mergedHeaders['Content-Type'] = 'application/json';
    }

    const response = await fetch(this.buildUrl(url, config.params), {
      method,
      headers: mergedHeaders,
      body: data === undefined ? undefined : isFormData ? data : JSON.stringify(data),
    });

    const text = await response.text();
    let parsed;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }

    if (!response.ok) {
      const message =
        (parsed && typeof parsed === 'object' && (parsed.detail || parsed.message)) ||
        (typeof parsed === 'string' ? parsed : '') ||
        `Request failed (${response.status})`;
      throw new Error(message);
    }

    return {
      data: parsed,
      status: response.status,
      headers: response.headers,
    };
  }

  async get(url, paramsOrConfig = {}) {
    const hasParamsKey =
      paramsOrConfig &&
      typeof paramsOrConfig === 'object' &&
      Object.prototype.hasOwnProperty.call(paramsOrConfig, 'params');
    const config = hasParamsKey ? paramsOrConfig : { params: paramsOrConfig };
    return this.request('GET', url, undefined, config);
  }

  async post(url, data = {}, config = {}) {
    return this.request('POST', url, data, config);
  }

  async put(url, data = {}, config = {}) {
    return this.request('PUT', url, data, config);
  }

  async patch(url, data = {}, config = {}) {
    return this.request('PATCH', url, data, config);
  }

  async delete(url, config = {}) {
    return this.request('DELETE', url, undefined, config);
  }
}

export default new ApiClient();
