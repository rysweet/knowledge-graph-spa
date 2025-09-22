import axios from 'axios';

const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? '/api'
  : 'http://localhost:3001/api';

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
    });
  }

  async healthCheck() {
    const response = await this.client.get('/health');
    return response.data;
  }

  async getGraph() {
    const response = await this.client.get('/graph');
    return response.data;
  }

  async search(query, type = 'all') {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (type && type !== 'all') params.append('type', type);

    const response = await this.client.get(`/search?${params.toString()}`);
    return response.data;
  }

  async getNodeDetails(nodeId) {
    const response = await this.client.get(`/node/${nodeId}`);
    return response.data;
  }

  async getStats() {
    const response = await this.client.get('/stats');
    return response.data;
  }
}

export const apiService = new ApiService();