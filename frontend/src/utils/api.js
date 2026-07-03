import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

API.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authAPI = {
  register: (data) => API.post('/auth/register', data),
  login: (data) => API.post('/auth/login', data),
  me: () => API.get('/auth/me'),
};

export const tournamentAPI = {
  getAll: () => API.get('/tournaments'),
  getOne: (id) => API.get(`/tournaments/${id}`),
  create: (data) => API.post('/tournaments', data),
  update: (id, data) => API.put(`/tournaments/${id}`, data),
  delete: (id) => API.delete(`/tournaments/${id}`),
};

export const teamAPI = {
  getByTournament: (tournamentId) => API.get(`/teams/tournament/${tournamentId}`),
  getAll: () => API.get('/teams'),
  register: (data) => API.post('/teams/register', data),
  updateStatus: (id, data) => API.put(`/teams/${id}/status`, data),
  update: (id, data) => API.put(`/teams/${id}`, data),
  delete: (id) => API.delete(`/teams/${id}`),
  getMyTeams: () => API.get('/teams/my/teams'),
};

export const matchAPI = {
  getByTournament: (tournamentId) => API.get(`/matches/tournament/${tournamentId}`),
  generate: (tournamentId) => API.post(`/matches/generate/${tournamentId}`),
  updateScore: (id, data) => API.put(`/matches/${id}/score`, data),
  update: (id, data) => API.put(`/matches/${id}`, data),
};

// ─────────────────────────────────────────────────────────────────────
// ADD ONLY THIS BLOCK at the bottom of your existing frontend/src/utils/api.js
// Do NOT touch any existing code above it
// ─────────────────────────────────────────────────────────────────────

export const fixtureAPI = {
  // Generate Double Round Robin fixtures for a tournament (admin)
  generate: (tournamentId, data) =>
    API.post(`/fixtures/generate/${tournamentId}`, data),

  // Get all DRR fixtures for a tournament (public)
  getByTournament: (tournamentId) =>
    API.get(`/fixtures/tournament/${tournamentId}`),

  // Edit a fixture — date, time, venue, status, scores (admin)
  update: (id, data) =>
    API.put(`/fixtures/${id}`, data),

  // Delete a single fixture (admin)
  delete: (id) =>
    API.delete(`/fixtures/${id}`),

  // Clear all DRR fixtures for a tournament (admin)
  clearAll: (tournamentId) =>
    API.delete(`/fixtures/tournament/${tournamentId}`),
};


export default API;
