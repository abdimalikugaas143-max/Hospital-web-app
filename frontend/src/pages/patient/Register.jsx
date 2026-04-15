import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '', phone: '',
    date_of_birth: '', gender: '', blood_type: '', address: '',
  });

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleStep1 = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setError('Please fill all required fields');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await authAPI.register({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        date_of_birth: form.date_of_birth || undefined,
        gender: form.gender || undefined,
        blood_type: form.blood_type || undefined,
        address: form.address || undefined,
      });
      login(data.token, data.user);
      navigate('/book-appointment');
    } catch (err) {
      const e = err.response?.data?.error;
      setError(typeof e === 'string' ? e : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-10">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Step {step} of 2</span>
            <span className="text-sm text-gray-400">{step === 1 ? 'Account Details' : 'Personal Info'}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: step === 1 ? '50%' : '100%' }}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {step === 1 ? 'Create Account' : 'Personal Information'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {step === 1 ? 'Set up your login credentials' : 'Help us serve you better (optional)'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3 mb-5 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleStep1} className="space-y-4">
              <div>
                <label className="label">Full Name *</label>
                <input name="name" type="text" value={form.name} onChange={handleChange}
                  className="input-field" placeholder="John Doe" required />
              </div>
              <div>
                <label className="label">Email Address *</label>
                <input name="email" type="email" value={form.email} onChange={handleChange}
                  className="input-field" placeholder="john@example.com" required />
              </div>
              <div>
                <label className="label">Phone Number</label>
                <input name="phone" type="tel" value={form.phone} onChange={handleChange}
                  className="input-field" placeholder="+1 234 567 8900" />
              </div>
              <div>
                <label className="label">Password *</label>
                <input name="password" type="password" value={form.password} onChange={handleChange}
                  className="input-field" placeholder="Min. 6 characters" required />
              </div>
              <div>
                <label className="label">Confirm Password *</label>
                <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange}
                  className="input-field" placeholder="Repeat password" required />
              </div>
              <button type="submit" className="btn-primary w-full py-3 mt-2">
                Continue →
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Date of Birth</label>
                  <input name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange}
                    className="input-field" />
                </div>
                <div>
                  <label className="label">Gender</label>
                  <select name="gender" value={form.gender} onChange={handleChange} className="input-field">
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Blood Type</label>
                <select name="blood_type" value={form.blood_type} onChange={handleChange} className="input-field">
                  <option value="">Select blood type</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Address</label>
                <textarea name="address" value={form.address} onChange={handleChange}
                  className="input-field" rows={2} placeholder="Your home address" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1 py-3">
                  ← Back
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 py-3">
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
