// import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

class ApiClient {
  constructor() {
    // this.client = axios.create({
    //   baseURL: API_BASE_URL,
    //   timeout: 10000,
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    // });

    // this.setupInterceptors();
  }

  setupInterceptors() {
    // Mock implementation for now
  }

  async get(url, params = {}) {
    // Mock implementation
    return { data: [] };
  }

  async post(url, data = {}) {
    // Mock implementation
    return { data: {} };
  }

  async put(url, data = {}) {
    // Mock implementation
    return { data: {} };
  }

  async delete(url) {
    // Mock implementation
    return { data: {} };
  }
}

export default new ApiClient();
