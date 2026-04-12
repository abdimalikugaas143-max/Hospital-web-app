import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import StatsCard from '../../components/StatsCard';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import { queueAPI } from '../../api/queue';
import { appointmentsAPI } from '../../api/appointments';
import { useSocket } from '../../context/SocketContext';

export default function ReceptionistDashboard() {
  const [stats, setStats] = useState(null);
  const [todayQueue, setTodayQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { onQueueUpdate } = useSocket();

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, queueRes] = await Promise.all([
        queueAPI.getStats(),
        queueAPI.getToday(),
      ]);
      setStats(statsRes.data.stats);
      setTodayQueue(queueRes.data.queue.slice(0, 8));
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

  const handleCall = async (queueId) => {
    try {
      await queueAPI.callPatient(queueId);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to call patient');
    }
  };

  const handleComplete = async (queueId) => {
    try {
      await queueAPI.completeEntry(queueId);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to complete');
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Receptionist Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {loading ? (
          <LoadingSpinner text="Loading dashboard..." />
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchData} className="text-sm font-medium underline">Retry</button>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatsCard title="Waiting" value={stats?.waiting || 0} icon="⏳" color="yellow" />
              <StatsCard title="Called" value={stats?.called || 0} icon="📢" color="blue" />
              <StatsCard title="In Progress" value={stats?.in_progress || 0} icon="🏃" color="purple" />
              <StatsCard title="Completed" value={stats?.completed || 0} icon="✅" color="green" />
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[
                { to: '/receptionist/register-patient', icon: '➕', label: 'Register Patient', color: 'bg-blue-600' },
                { to: '/receptionist/queue', icon: '📋', label: 'Queue Management', color: 'bg-purple-600' },
                { to: '/receptionist/search', icon: '🔍', label: 'Search Patient', color: 'bg-green-600' },
                { to: '/receptionist/queue', icon: '📊', label: 'View All Queue', color: 'bg-orange-600' },
              ].map(({ to, icon, label, color }) => (
                <Link key={to} to={to}
                  className={`${color} text-white rounded-xl p-4 text-center hover:opacity-90 transition-opacity shadow-sm`}>
                  <div className="text-2xl mb-1">{icon}</div>
                  <p className="text-sm font-medium">{label}</p>
                </Link>
              ))}
            </div>

            {/* Today's queue preview */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Today's Queue</h2>
                <Link to="/receptionist/queue" className="text-sm text-primary-600 hover:underline">View All →</Link>
              </div>
              <div className="divide-y divide-gray-100">
                {todayQueue.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-8">No patients in queue today</p>
                ) : (
                  todayQueue.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-600 text-sm shrink-0">
                          {String(entry.queue_number).padStart(3, '0')}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{entry.patient_name}</p>
                          <p className="text-xs text-gray-500">{entry.doctor_name} · {entry.department_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={entry.status} />
                        {entry.status === 'waiting' && (
                          <button onClick={() => handleCall(entry.id)}
                            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">
                            Call
                          </button>
                        )}
                        {entry.status === 'in_progress' && (
                          <button onClick={() => handleComplete(entry.id)}
                            className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700">
                            Done
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
