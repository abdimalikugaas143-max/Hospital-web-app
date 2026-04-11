import api from './axiosInstance';

export const queueAPI = {
  getToday: (params) => api.get('/queue/today', { params }),
  getStats: () => api.get('/queue/stats'),
  callPatient: (id) => api.put(`/queue/${id}/call`),
  completeEntry: (id) => api.put(`/queue/${id}/complete`),
};
