import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Market ──────────────────────────────────────────────────
export const marketApi = {
  getOverview: () => api.get('/market/overview').then(r => r.data),
  getCandles: (ticker: string, from: string, interval = '1D') =>
    api.get(`/market/candles/${ticker}`, { params: { from_date: from, interval } }).then(r => r.data),
  getTickerDetail: (ticker: string) =>
    api.get(`/market/ticker/${ticker}`).then(r => r.data),
  getMovers: (direction: 'gain' | 'loss', n = 10) =>
    api.get('/market/movers', { params: { direction, n } }).then(r => r.data),
  getSectors: () => api.get('/market/sectors').then(r => r.data),
  getMacro: (from = '2023-01-01') =>
    api.get('/market/macro', { params: { from_date: from } }).then(r => r.data),
  getBreadth: () => api.get('/market/breadth').then(r => r.data),
  getForeignFlow: (tickers?: string, from = '2024-01-01') =>
    api.get('/market/foreign-flow', { params: { tickers, from_date: from } }).then(r => r.data),
};

// ── Analysis ─────────────────────────────────────────────────
export const analysisApi = {
  analyze: (ticker: string) => api.get(`/analysis/${ticker}`).then(r => r.data),
  getSignal: (ticker: string) => api.get(`/analysis/${ticker}/signal`).then(r => r.data),
  getShap: (ticker: string) => api.get(`/analysis/${ticker}/shap`).then(r => r.data),
  getNarrative: (ticker: string) => api.get(`/analysis/${ticker}/narrative`).then(r => r.data),
  getTechnicals: (ticker: string, from = '2024-01-01') =>
    api.get(`/analysis/${ticker}/technicals`, { params: { from_date: from } }).then(r => r.data),
};

// ── Prediction ────────────────────────────────────────────────
export const predictionApi = {
  getRecommendations: (tickers?: string, horizon = 5) =>
    api.get('/prediction/recommendations', { params: { tickers, horizon_days: horizon } }).then(r => r.data),
  predict: (ticker: string, horizon = 5) =>
    api.get(`/prediction/${ticker}`, { params: { horizon_days: horizon } }).then(r => r.data),
};

// ── Portfolio ─────────────────────────────────────────────────
export const portfolioApi = {
  list: () => api.get('/portfolio/').then(r => r.data),
  create: (name: string, description?: string) =>
    api.post('/portfolio/', { name, description }).then(r => r.data),
  get: (id: number) => api.get(`/portfolio/${id}`).then(r => r.data),
  addHolding: (portfolioId: number, ticker: string, quantity: number, avgCost: number) =>
    api.post(`/portfolio/${portfolioId}/holdings`, { ticker, quantity, avg_cost: avgCost }).then(r => r.data),
  deleteHolding: (portfolioId: number, holdingId: number) =>
    api.delete(`/portfolio/${portfolioId}/holdings/${holdingId}`).then(r => r.data),
  optimize: (portfolioId: number, objective = 'sharpe') =>
    api.post('/portfolio/optimize', { portfolio_id: portfolioId, objective }).then(r => r.data),
};

// ── Reflection ────────────────────────────────────────────────
export const reflectionApi = {
  getHistory: (ticker?: string, days = 30) =>
    api.get('/reflection/history', { params: { ticker, days } }).then(r => r.data),
  getSummary: (days = 30) =>
    api.get('/reflection/summary', { params: { days } }).then(r => r.data),
};

// ── Simulator ─────────────────────────────────────────────────
export const simulatorApi = {
  analyze: (body: any) => api.post('/simulator/analyze', body).then(r => r.data),
  getScenarios: () => api.get('/simulator/scenarios').then(r => r.data),
  optimizeSuggest: (body: any) => api.post('/simulator/optimize-suggest', body).then(r => r.data),
};

// ── Settings ──────────────────────────────────────────────────
export const settingsApi = {
  getProfile: () => api.get('/settings/profile').then(r => r.data),
  updateProfile: (body: any) => api.put('/settings/profile', body).then(r => r.data),
  getAlerts: () => api.get('/settings/alerts').then(r => r.data),
  createPriceAlert: (body: any) => api.post('/settings/alerts/price', body).then(r => r.data),
  createSignalAlert: (body: any) => api.post('/settings/alerts/signal', body).then(r => r.data),
  deleteAlert: (id: string) => api.delete(`/settings/alerts/${id}`).then(r => r.data),
  getNotifications: () => api.get('/settings/notifications').then(r => r.data),
};

export default api;
