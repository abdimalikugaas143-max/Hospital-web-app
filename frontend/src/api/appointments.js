import api from './axiosInstance';

export const appointmentsAPI = {
  getAll: (params) => api.get('/appointments', { params }),
  getToday: (params) => api.get('/appointments/today', { params }),
  getById: (id) => api.get(`/appointments/${id}`),
  book: (data) => api.post('/appointments', data),
  updateStatus: (id, data) => api.put(`/appointments/${id}/status`, data),
  cancel: (id) => api.put(`/appointments/${id}/cancel`),
};
