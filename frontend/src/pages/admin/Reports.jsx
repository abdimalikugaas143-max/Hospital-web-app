import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DashboardLayout from '../../components/DashboardLayout';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import { reportsAPI } from '../../api/reports';
import { departmentsAPI } from '../../api/departments';

export default function Reports() {
  const [appointments, setAppointments] = useState([]);
  const [doctorStats, setDoctorStats] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('appointments');
  const [filters, setFilters] = useState({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    department_id: '',
    status: '',
  });
  const [total, setTotal] = useState(0);

  useEffect(() => {
    departmentsAPI.getAll().then(({ data }) => setDepartments(data.departments)).catch(console.error);
  }, []);

  useEffect(() => {
    if (tab === 'appointments') fetchAppointments();
    else fetchDoctorStats();
  }, [tab, filters]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const { data } = await reportsAPI.getAppointments({
        start_date: filters.start_date,
        end_date: filters.end_date,
        department_id: filters.department_id || undefined,
        status: filters.status || undefined,
        limit: 100,
      });
      setAppointments(data.appointments);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctorStats = async () => {
    setLoading(true);
    try {
      const { data } = await reportsAPI.getDoctors({ start_date: filters.start_date, end_date: filters.end_date });
      setDoctorStats(data.doctors);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  const handleExportCSV = () => {
    if (appointments.length === 0) return;
    const headers = ['Date', 'Time', 'Patient', 'Card', 'Doctor', 'Department', 'Status', 'Queue #'];
    const rows = appointments.map(a => [
      a.appointment_date, a.appointment_time, a.patient_name, a.card_number,
      a.doctor_name, a.department_name, a.status, a.queue_number,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `appointments-report-${filters.start_date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Appointment and doctor performance reports</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-6 w-fit">
          {[
            { key: 'appointments', label: 'Appointments' },
            { key: 'doctors', label: 'Doctor Performance' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="label text-xs">Start Date</label>
              <input type="date" value={filters.start_date}
                onChange={e => setFilters(f => ({ ...f, start_date: e.target.value }))}
                className="input-field text-sm" />
            </div>
            <div>
              <label className="label text-xs">End Date</label>
              <input type="date" value={filters.end_date}
                onChange={e => setFilters(f => ({ ...f, end_date: e.target.value }))}
                className="input-field text-sm" />
            </div>
            {tab === 'appointments' && (
              <>
                <div>
                  <label className="label text-xs">Department</label>
                  <select value={filters.department_id} onChange={e => setFilters(f => ({ ...f, department_id: e.target.value }))} className="input-field text-sm">
                    <option value="">All</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label text-xs">Status</label>
                  <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="input-field text-sm">
                    <option value="">All</option>
                    {['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].map(s => (
                      <option key={s} value={s}>{s.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            {tab === 'appointments' && appointments.length > 0 && (
              <button onClick={handleExportCSV} className="btn-secondary text-sm flex items-center gap-2 ml-auto">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export CSV
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <LoadingSpinner text="Generating report..." />
        ) : tab === 'appointments' ? (
          <>
            <p className="text-sm text-gray-500 mb-3">{total} appointments found</p>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {appointments.length === 0 ? (
                <p className="text-center text-gray-400 py-12 text-sm">No appointments in this period</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                      <tr>
                        <th className="text-left px-4 py-3">Date</th>
                        <th className="text-left px-4 py-3">Patient</th>
                        <th className="text-left px-4 py-3 hidden sm:table-cell">Doctor</th>
                        <th className="text-left px-4 py-3 hidden md:table-cell">Department</th>
                        <th className="text-left px-4 py-3">Queue</th>
                        <th className="text-left px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {appointments.map((appt) => (
                        <tr key={appt.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5">
                            <p className="text-gray-700">{formatDate(appt.appointment_date)}</p>
                            <p className="text-xs text-gray-400">{appt.appointment_time?.slice(0, 5)}</p>
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="font-medium text-gray-900">{appt.patient_name}</p>
                            <p className="text-xs text-gray-400">{appt.card_number}</p>
                          </td>
                          <td className="px-4 py-2.5 hidden sm:table-cell text-gray-600">{appt.doctor_name}</td>
                          <td className="px-4 py-2.5 hidden md:table-cell text-gray-600">{appt.department_name}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className="font-bold text-primary-600">#{appt.queue_number}</span>
                          </td>
                          <td className="px-4 py-2.5"><StatusBadge status={appt.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {doctorStats.length === 0 ? (
              <p className="text-center text-gray-400 py-12 text-sm">No data available</p>
            ) : (
              <>
                <div className="p-5 border-b border-gray-100">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={doctorStats.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="doctor_name" tick={{ fontSize: 10 }}
                        tickFormatter={n => n.split(' ').pop()} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="total_appointments" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Total" />
                      <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} name="Completed" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="text-left px-5 py-3">Doctor</th>
                      <th className="text-left px-5 py-3 hidden sm:table-cell">Department</th>
                      <th className="text-center px-5 py-3">Total</th>
                      <th className="text-center px-5 py-3">Completed</th>
                      <th className="text-center px-5 py-3">Cancelled</th>
                      <th className="text-center px-5 py-3">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {doctorStats.map((doc) => {
                      const rate = doc.total_appointments > 0
                        ? Math.round((doc.completed / doc.total_appointments) * 100)
                        : 0;
                      return (
                        <tr key={doc.doctor_name} className="hover:bg-gray-50">
                          <td className="px-5 py-3">
                            <p className="font-medium text-gray-900">{doc.doctor_name}</p>
                            <p className="text-xs text-gray-400">{doc.specialization}</p>
                          </td>
                          <td className="px-5 py-3 hidden sm:table-cell text-gray-600">{doc.department_name}</td>
                          <td className="px-5 py-3 text-center font-bold text-gray-900">{doc.total_appointments}</td>
                          <td className="px-5 py-3 text-center text-green-600 font-medium">{doc.completed}</td>
                          <td className="px-5 py-3 text-center text-red-500">{doc.cancelled}</td>
                          <td className="px-5 py-3 text-center">
                            <span className={`text-xs font-bold ${rate >= 80 ? 'text-green-600' : rate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>{rate}%</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
