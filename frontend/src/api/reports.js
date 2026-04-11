import api from './axiosInstance';

export const reportsAPI = {
  getStats: () => api.get('/reports/stats'),
  getAppointments: (params) => api.get('/reports/appointments', { params }),
  getDoctors: (params) => api.get('/reports/doctors', { params }),
};
