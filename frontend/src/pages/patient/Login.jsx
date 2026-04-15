import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';

const roleRedirects = {
  patient: '/book-appointment',
  receptionist: '/receptionist',
  doctor: '/doctor',
  admin: '/admin',
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Email and password are required'); return; }
    setLoading(true);
    try {
      const { data } = await authAPI.login(form);
      login(data.token, data.user);
      const from = location.state?.from?.pathname || roleRedirects[data.user.role] || '/';
      navigate(from, { replace: true });
    } catch (err) {
      const e = err.response?.data?.error;
      setError(typeof e === 'string' ? e : 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = async (email, password) => {
    setForm({ email, password });
    setLoading(true);
    setError('');
    try {
      const { data } = await authAPI.login({ email, password });
      login(data.token, data.user);
      const from = location.state?.from?.pathname || roleRedirects[data.user.role] || '/';
      navigate(from, { replace: true });
    } catch (err) {
      const e = err.response?.data?.error;
      setError(typeof e === 'string' ? e : 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-md mx-auto px-4 py-14">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
            <p className="text-sm text-gray-500 mt-1">Sign in to your MedCare account</p>
          </div>

          {/* Demo accounts */}
          <div className="bg-blue-50 rounded-lg p-3 mb-5">
            <p className="text-xs font-medium text-blue-800 mb-2">Demo Accounts:</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Patient', email: 'patient@hospital.com', password: 'patient123' },
                { label: 'Receptionist', email: 'receptionist@hospital.com', password: 'receptionist123' },
                { label: 'Doctor', email: 'dr.chen@hospital.com', password: 'doctor123' },
                { label: 'Admin', email: 'admin@hospital.com', password: 'admin123' },
              ].map(({ label, email, password }) => (
                <button key={label} type="button"
                  onClick={() => demoLogin(email, password)}
                  className="text-xs bg-white border border-blue-200 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3 mb-5 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email Address</label>
              <input name="email" type="email" value={form.email} onChange={handleChange}
                className="input-field" placeholder="you@example.com" autoFocus />
            </div>
            <div>
              <label className="label">Password</label>
              <input name="password" type="password" value={form.password} onChange={handleChange}
                className="input-field" placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base mt-2">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 font-medium hover:underline">Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
