import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import StatusBadge from '../../components/StatusBadge';
import StatsCard from '../../components/StatsCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import { appointmentsAPI } from '../../api/appointments';
import { queueAPI } from '../../api/queue';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [todayPatients, setTodayPatients] = useState([]);
  const [queueStats, setQueueStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { onQueueUpdate } = useSocket();

  const fetchData = useCallback(async () => {
    try {
      const [apptRes, statsRes] = await Promise.all([
        appointmentsAPI.getToday(),
        queueAPI.getStats(),
      ]);
      setTodayPatients(apptRes.data.appointments);
      setQueueStats(statsRes.data.stats);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to load dashboard. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const unsubscribe = onQueueUpdate(() => fetchData());
    return () => unsubscribe();
  }, [fetchData, onQueueUpdate]);

  const completedToday = todayPatients.filter(a => a.status === 'completed').length;
  const waitingToday = todayPatients.filter(a => a.status === 'confirmed').length;
  const inProgressNow = todayPatients.filter(a => a.status === 'in_progress');

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Good {new Date().getHours() < 12 ? 'Morning' : 'Afternoon'}, {user?.name?.split(' ')[0]}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {loading ? <LoadingSpinner text="Loading..." /> : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchData} className="text-sm font-medium underline">Retry</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatsCard title="Today's Patients" value={todayPatients.length} icon="👥" color="blue" />
              <StatsCard title="Waiting" value={waitingToday} icon="⏳" color="orange" />
              <StatsCard title="In Progress" value={inProgressNow.length} icon="🏃" color="purple" />
              <StatsCard title="Completed" value={completedToday} icon="✅" color="green" />
            </div>

            {/* Currently in progress */}
            {inProgressNow.length > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 mb-6">
                <h3 className="font-semibold text-purple-900 mb-3">Currently Seeing</h3>
                {inProgressNow.map(patient => (
                  <div key={patient.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-purple-900">{patient.patient_name}</p>
                      <p className="text-sm text-purple-600">Card: {patient.card_number} · Queue #{patient.queue_number}</p>
                    </div>
                    <Link to={`/doctor/patients/${patient.patient_id}`} state={{ appointmentId: patient.id }}
                      className="btn-primary text-sm">
                      View Details
                    </Link>
                  </div>
                ))}
              </div>
            )}

            {/* Today's patient list */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Today's Patients</h2>
                <Link to="/doctor/patients" className="text-sm text-primary-600 hover:underline">Full List →</Link>
              </div>
              {todayPatients.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-10">No patients scheduled for today</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {todayPatients.map((patient) => (
                    <div key={patient.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 text-sm">
                          {String(patient.queue_number).padStart(2, '0')}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{patient.patient_name}</p>
                          <p className="text-xs text-gray-400">{patient.appointment_time?.slice(0, 5)} · {patient.card_number}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={patient.status} />
                        {['confirmed', 'in_progress'].includes(patient.status) && (
                          <Link to={`/doctor/patients/${patient.patient_id}`} state={{ appointmentId: patient.id }}
                            className="text-xs text-primary-600 font-medium hover:underline">
                            Details →
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
