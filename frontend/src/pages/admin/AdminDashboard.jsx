import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import DashboardLayout from '../../components/DashboardLayout';
import StatsCard from '../../components/StatsCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import { reportsAPI } from '../../api/reports';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportsAPI.getStats()
      .then(({ data: d }) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLayout><div className="p-6"><LoadingSpinner text="Loading..." /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Hospital overview and statistics</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard title="Total Patients" value={data?.stats.totalPatients?.toLocaleString()} icon="👥" color="blue" />
          <StatsCard title="Active Doctors" value={data?.stats.totalDoctors} icon="🩺" color="purple" />
          <StatsCard title="Today's Appts" value={data?.stats.todayAppointments} icon="📅" color="orange" />
          <StatsCard title="Total Appts" value={data?.stats.totalAppointments?.toLocaleString()} icon="📋" color="green" />
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { to: '/admin/doctors', icon: '🩺', label: 'Manage Doctors', color: 'bg-purple-600' },
            { to: '/admin/departments', icon: '🏥', label: 'Departments', color: 'bg-blue-600' },
            { to: '/admin/reports', icon: '📊', label: 'Reports', color: 'bg-green-600' },
            { to: '/admin/reports', icon: '👤', label: 'User Management', color: 'bg-orange-600' },
          ].map(({ to, icon, label, color }) => (
            <Link key={to + label} to={to}
              className={`${color} text-white rounded-xl p-4 text-center hover:opacity-90 transition-opacity`}>
              <div className="text-2xl mb-1">{icon}</div>
              <p className="text-sm font-medium">{label}</p>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly trend chart */}
          {data?.weeklyTrend?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Appointments (Last 7 Days)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }}
                    tickFormatter={d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Appointments" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Department stats */}
          {data?.departmentStats?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Appointments by Department</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={data.departmentStats} dataKey="appointment_count" nameKey="name"
                    cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false} fontSize={10}>
                    {data.departmentStats.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Today status breakdown */}
          {data?.statusStats?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Today by Status</h3>
              <div className="space-y-3">
                {data.statusStats.map(({ status, count }) => {
                  const total = data.statusStats.reduce((sum, s) => sum + parseInt(s.count), 0);
                  const pct = total > 0 ? (parseInt(count) / total) * 100 : 0;
                  const colors = { confirmed: 'bg-blue-500', completed: 'bg-green-500', cancelled: 'bg-red-500', in_progress: 'bg-purple-500', pending: 'bg-yellow-500' };
                  return (
                    <div key={status}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize text-gray-700">{status.replace('_', ' ')}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className={`h-2 rounded-full ${colors[status] || 'bg-gray-400'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top departments */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Top Departments</h3>
            <div className="space-y-3">
              {(data?.departmentStats || []).map(({ name, appointment_count }, i) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center" style={{ background: PIE_COLORS[i % PIE_COLORS.length], color: 'white' }}>{i + 1}</span>
                  <span className="text-sm text-gray-700 flex-1">{name}</span>
                  <span className="text-sm font-semibold text-gray-900">{appointment_count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
