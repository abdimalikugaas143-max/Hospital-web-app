import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import { queueAPI } from '../../api/queue';
import { departmentsAPI } from '../../api/departments';
import { useSocket } from '../../context/SocketContext';

export default function QueueManagement() {
  const [queue, setQueue] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const { joinDepartment, leaveDepartment, onQueueUpdate } = useSocket();

  const fetchData = useCallback(async () => {
    try {
      const [queueRes, statsRes] = await Promise.all([
        queueAPI.getToday(selectedDept ? { department_id: selectedDept } : {}),
        queueAPI.getStats(),
      ]);
      setQueue(queueRes.data?.queue || []);
      setStats(statsRes.data?.stats || {});
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedDept]);

  useEffect(() => {
    departmentsAPI.getAll().then(({ data }) => setDepartments(data.departments)).catch(console.error);
  }, []);

  useEffect(() => {
    fetchData();
    const unsubscribe = onQueueUpdate(() => fetchData());
    return () => unsubscribe();
  }, [fetchData, onQueueUpdate]);

  useEffect(() => {
    if (selectedDept) {
      joinDepartment?.(selectedDept);
      return () => leaveDepartment?.(selectedDept);
    }
  }, [selectedDept]);

  const handleCall = async (id) => {
    try {
      await queueAPI.callPatient(id);
      fetchData();
    } catch (err) {
      const e = err.response?.data?.error;
      alert(typeof e === 'string' ? e : 'Failed to call patient');
    }
  };

  const handleComplete = async (id) => {
    try {
      await queueAPI.completeEntry(id);
      fetchData();
    } catch (err) {
      const e = err.response?.data?.error;
      alert(typeof e === 'string' ? e : 'Failed to complete');
    }
  };

  const waiting = queue.filter(q => q.status === 'waiting');
  const active = queue.filter(q => ['called', 'in_progress'].includes(q.status));
  const done = queue.filter(q => ['completed', 'skipped'].includes(q.status));

  const QueueTable = ({ entries, title, color }) => (
    <div className="bg-white rounded-xl border border-gray-200 mb-4">
      <div className={`px-5 py-3 border-b border-gray-100 flex items-center justify-between`}>
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>{entries.length}</span>
      </div>
      {entries.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-6">No patients in this section</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="text-left px-5 py-2">Queue #</th>
                <th className="text-left px-5 py-2">Patient</th>
                <th className="text-left px-5 py-2 hidden sm:table-cell">Doctor</th>
                <th className="text-left px-5 py-2 hidden md:table-cell">Time</th>
                <th className="text-left px-5 py-2">Status</th>
                <th className="text-left px-5 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <span className="font-bold text-primary-600 text-base">{String(entry.queue_number).padStart(3, '0')}</span>
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{entry.patient_name}</p>
                    <p className="text-xs text-gray-400">{entry.card_number}</p>
                  </td>
                  <td className="px-5 py-3 hidden sm:table-cell text-gray-600">{entry.doctor_name}</td>
                  <td className="px-5 py-3 hidden md:table-cell text-gray-500">
                    {entry.appointment_time ? entry.appointment_time.slice(0, 5) : '—'}
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={entry.status} /></td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      {entry.status === 'waiting' && (
                        <button onClick={() => handleCall(entry.id)}
                          className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
                          Call
                        </button>
                      )}
                      {['called', 'in_progress'].includes(entry.status) && (
                        <button onClick={() => handleComplete(entry.id)}
                          className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700">
                          Complete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Queue Management</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Last updated: {lastUpdated.toLocaleTimeString()}
              <span className="ml-2 inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                Live
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)} className="input-field text-sm max-w-xs">
              <option value="">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <button onClick={fetchData} className="btn-secondary text-sm flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Stats bar */}
        {stats && (
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Waiting', value: stats?.waiting ?? 0, bg: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
              { label: 'Active', value: parseInt(stats?.called || 0) + parseInt(stats?.in_progress || 0), bg: 'bg-blue-50 text-blue-700 border-blue-200' },
              { label: 'Completed', value: stats?.completed ?? 0, bg: 'bg-green-50 text-green-700 border-green-200' },
              { label: 'Total', value: stats?.total ?? 0, bg: 'bg-gray-50 text-gray-700 border-gray-200' },
            ].map(({ label, value, bg }) => (
              <div key={label} className={`rounded-xl border p-3 text-center ${bg}`}>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs font-medium">{label}</p>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <LoadingSpinner text="Loading queue..." />
        ) : (
          <>
            <QueueTable entries={active} title="Active (Called / In Progress)" color="bg-blue-100 text-blue-800" />
            <QueueTable entries={waiting} title="Waiting" color="bg-yellow-100 text-yellow-800" />
            <QueueTable entries={done} title="Completed" color="bg-green-100 text-green-800" />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
