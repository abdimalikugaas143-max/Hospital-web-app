import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import { appointmentsAPI } from '../../api/appointments';

export default function PatientList() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('today');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchAppointments();
  }, [filter, dateFilter]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter === 'today') params.date = new Date().toISOString().split('T')[0];
      else if (filter === 'date') params.date = dateFilter;
      const { data } = await appointmentsAPI.getAll(params);
      setAppointments(data.appointments);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  const formatTime = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hour = parseInt(h);
    return `${hour > 12 ? hour - 12 : hour}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Patient List</h1>
          <p className="text-sm text-gray-500 mt-1">{appointments.length} patients</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6 bg-white rounded-xl border border-gray-200 p-4">
          {[
            { key: 'today', label: "Today" },
            { key: 'all', label: "All" },
            { key: 'date', label: "By Date" },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f.key ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}>
              {f.label}
            </button>
          ))}
          {filter === 'date' && (
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="input-field text-sm w-auto"
            />
          )}
        </div>

        {loading ? (
          <LoadingSpinner text="Loading patients..." />
        ) : appointments.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="text-4xl mb-3">👥</div>
            <p className="font-semibold text-gray-900">No patients found</p>
            <p className="text-sm text-gray-500 mt-1">No appointments for this period</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="text-left px-5 py-3">Queue</th>
                  <th className="text-left px-5 py-3">Patient</th>
                  <th className="text-left px-5 py-3 hidden sm:table-cell">Date & Time</th>
                  <th className="text-left px-5 py-3 hidden md:table-cell">Department</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-left px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {appointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <span className="font-bold text-primary-600">{String(appt.queue_number).padStart(3, '0')}</span>
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{appt.patient_name}</p>
                      <p className="text-xs text-gray-400">{appt.card_number} · {appt.patient_phone}</p>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell">
                      <p className="text-gray-700">{formatDate(appt.appointment_date)}</p>
                      <p className="text-xs text-gray-400">{formatTime(appt.appointment_time)}</p>
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell text-gray-600">{appt.department_name}</td>
                    <td className="px-5 py-3"><StatusBadge status={appt.status} /></td>
                    <td className="px-5 py-3">
                      <Link to={`/doctor/patients/${appt.patient_id}`} state={{ appointmentId: appt.id }}
                        className="text-primary-600 hover:text-primary-700 font-medium text-xs hover:underline">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
