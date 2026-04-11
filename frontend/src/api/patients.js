import api from './axiosInstance';

export const patientsAPI = {
  getAll: (params) => api.get('/patients', { params }),
  getMe: () => api.get('/patients/me'),
  getById: (id) => api.get(`/patients/${id}`),
  search: (q) => api.get('/patients/search', { params: { q } }),
  registerWalkIn: (data) => api.post('/patients/walk-in', data),
  getMedicalRecords: (id) => api.get(`/patients/${id}/medical-records`),
};
