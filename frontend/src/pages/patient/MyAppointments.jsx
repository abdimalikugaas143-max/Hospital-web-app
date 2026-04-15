import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import StatusBadge from '../../components/StatusBadge';
import QRTicket from '../../components/QRTicket';
import LoadingSpinner from '../../components/LoadingSpinner';
import { appointmentsAPI } from '../../api/appointments';

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}
function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h);
  return `${hour > 12 ? hour - 12 : hour}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

export default function MyAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [cancelId, setCancelId] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const { data } = await appointmentsAPI.getAll();
      setAppointments(data?.appointments || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return;
    try {
      await appointmentsAPI.cancel(id);
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a));
    } catch (err) {
      const e = err.response?.data?.error;
      alert(typeof e === 'string' ? e : 'Failed to cancel');
    }
    setCancelId(null);
  };

  const handleViewTicket = async (appt) => {
    try {
      const { data } = await appointmentsAPI.getById(appt.id);
      setSelectedTicket(data.appointment);
    } catch {
      setSelectedTicket(appt);
    }
  };

  const filtered = filter === 'all' ? appointments : appointments.filter(a => a.status === filter);

  const statusCounts = appointments.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Appointments</h1>
            <p className="text-sm text-gray-500 mt-1">{appointments.length} total appointment{appointments.length !== 1 ? 's' : ''}</p>
          </div>
          <Link to="/book-appointment" className="btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Appointment
          </Link>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { key: 'confirmed', label: 'Confirmed', color: 'text-blue-600 bg-blue-50' },
            { key: 'in_progress', label: 'In Progress', color: 'text-purple-600 bg-purple-50' },
            { key: 'completed', label: 'Completed', color: 'text-green-600 bg-green-50' },
            { key: 'cancelled', label: 'Cancelled', color: 'text-red-600 bg-red-50' },
          ].map(({ key, label, color }) => (
            <div key={key} className={`rounded-xl p-4 ${color}`}>
              <p className="text-2xl font-bold">{statusCounts[key] || 0}</p>
              <p className="text-xs font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {['all', 'confirmed', 'in_progress', 'completed', 'cancelled'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                filter === f ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}>
              {f === 'all' ? 'All' : f.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
              {f !== 'all' && statusCounts[f] ? ` (${statusCounts[f]})` : ''}
            </button>
          ))}
        </div>

        {/* Appointments list */}
        {loading ? (
          <div className="py-20"><LoadingSpinner text="Loading appointments..." /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="text-4xl mb-4">📅</div>
            <p className="font-semibold text-gray-900 mb-2">No appointments found</p>
            <p className="text-sm text-gray-500 mb-6">
              {filter === 'all' ? "You haven't booked any appointments yet" : `No ${filter} appointments`}
            </p>
            {filter === 'all' && (
              <Link to="/book-appointment" className="btn-primary">Book Your First Appointment</Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((appt) => (
              <div key={appt.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
                      <span className="text-primary-600 font-bold text-lg">
                        {String(appt.queue_number || '?').padStart(2, '0')}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">{appt.doctor_name}</span>
                        <StatusBadge status={appt.status} />
                      </div>
                      <p className="text-sm text-gray-500">{appt.department_name} · {appt.specialization}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          📅 {formatDate(appt.appointment_date)}
                        </span>
                        <span className="flex items-center gap-1">
                          🕐 {formatTime(appt.appointment_time)}
                        </span>
                        <span className="flex items-center gap-1">
                          🎫 Queue #{appt.queue_number}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleViewTicket(appt)}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium px-3 py-1.5 rounded-lg hover:bg-primary-50 border border-primary-200"
                    >
                      Ticket
                    </button>
                    {['pending', 'confirmed'].includes(appt.status) && (
                      <button
                        onClick={() => handleCancel(appt.id)}
                        className="text-sm text-red-600 hover:text-red-700 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 border border-red-200"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {appt.symptoms && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500">Symptoms: <span className="text-gray-700">{appt.symptoms}</span></p>
                  </div>
                )}

                {appt.estimated_wait_minutes > 0 && appt.status === 'confirmed' && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-orange-600 font-medium">
                      ⏱️ Estimated wait: ~{appt.estimated_wait_minutes} minutes
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedTicket && (
        <QRTicket appointment={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}
    </div>
  );
}
