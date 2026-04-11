import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import { doctorsAPI } from '../../api/doctors';
import { departmentsAPI } from '../../api/departments';

export default function ManageDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editDoctor, setEditDoctor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '',
    department_id: '', specialization: '', bio: '', consultation_fee: '',
    available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  });

  useEffect(() => {
    Promise.all([
      doctorsAPI.getAll().then(r => setDoctors(r.data.doctors)),
      departmentsAPI.getAll().then(r => setDepartments(r.data.departments)),
    ]).finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleDayToggle = (day) => {
    setForm(prev => ({
      ...prev,
      available_days: prev.available_days.includes(day)
        ? prev.available_days.filter(d => d !== day)
        : [...prev.available_days, day],
    }));
  };

  const openAdd = () => {
    setEditDoctor(null);
    setForm({ name: '', email: '', password: '', phone: '', department_id: '', specialization: '', bio: '', consultation_fee: '', available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (doc) => {
    setEditDoctor(doc);
    setForm({
      name: doc.name || '', email: doc.email || '', password: '', phone: doc.phone || '',
      department_id: doc.department_id || '', specialization: doc.specialization || '',
      bio: doc.bio || '', consultation_fee: doc.consultation_fee || '',
      available_days: doc.available_days || [],
    });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editDoctor) {
        await doctorsAPI.update(editDoctor.id, form);
        setDoctors(prev => prev.map(d => d.id === editDoctor.id ? { ...d, ...form } : d));
      } else {
        const { data } = await doctorsAPI.create(form);
        const updated = await doctorsAPI.getAll();
        setDoctors(updated.data.doctors);
      }
      setModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Deactivate this doctor?')) return;
    try {
      await doctorsAPI.delete(id);
      setDoctors(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to deactivate');
    }
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Doctors</h1>
            <p className="text-sm text-gray-500 mt-1">{doctors.length} registered doctors</p>
          </div>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Doctor
          </button>
        </div>

        {loading ? (
          <LoadingSpinner text="Loading doctors..." />
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="text-left px-5 py-3">Doctor</th>
                  <th className="text-left px-5 py-3 hidden sm:table-cell">Department</th>
                  <th className="text-left px-5 py-3 hidden md:table-cell">Specialization</th>
                  <th className="text-left px-5 py-3 hidden lg:table-cell">Available Days</th>
                  <th className="text-left px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {doctors.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-600 text-sm shrink-0">
                          {doc.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{doc.name}</p>
                          <p className="text-xs text-gray-400">{doc.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell text-gray-600">{doc.department_name || '—'}</td>
                    <td className="px-5 py-3 hidden md:table-cell text-gray-600">{doc.specialization || '—'}</td>
                    <td className="px-5 py-3 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {(doc.available_days || []).slice(0, 3).map(d => (
                          <span key={d} className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{d.slice(0, 3)}</span>
                        ))}
                        {(doc.available_days || []).length > 3 && <span className="text-xs text-gray-400">+{doc.available_days.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(doc)} className="text-xs text-primary-600 font-medium hover:underline">Edit</button>
                        <button onClick={() => handleDeactivate(doc.id)} className="text-xs text-red-600 font-medium hover:underline">Remove</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {doctors.length === 0 && (
              <p className="text-center text-gray-400 py-10 text-sm">No doctors registered yet</p>
            )}
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editDoctor ? 'Edit Doctor' : 'Add New Doctor'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name *</label>
              <input name="name" value={form.name} onChange={handleChange} className="input-field" placeholder="Dr. John Smith" required />
            </div>
            <div>
              <label className="label">Email *</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} className="input-field" required disabled={!!editDoctor} />
            </div>
          </div>
          {!editDoctor && (
            <div>
              <label className="label">Password *</label>
              <input name="password" type="password" value={form.password} onChange={handleChange} className="input-field" required />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Phone</label>
              <input name="phone" value={form.phone} onChange={handleChange} className="input-field" />
            </div>
            <div>
              <label className="label">Consultation Fee ($)</label>
              <input name="consultation_fee" type="number" value={form.consultation_fee} onChange={handleChange} className="input-field" min="0" step="0.01" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Department</label>
              <select name="department_id" value={form.department_id} onChange={handleChange} className="input-field">
                <option value="">Select department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Specialization</label>
              <input name="specialization" value={form.specialization} onChange={handleChange} className="input-field" placeholder="e.g. Cardiologist" />
            </div>
          </div>
          <div>
            <label className="label">Bio</label>
            <textarea name="bio" value={form.bio} onChange={handleChange} className="input-field" rows={2} placeholder="Brief professional bio..." />
          </div>
          <div>
            <label className="label mb-2">Available Days</label>
            <div className="flex flex-wrap gap-2">
              {days.map(day => (
                <button key={day} type="button"
                  onClick={() => handleDayToggle(day)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    form.available_days.includes(day)
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'
                  }`}>
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : editDoctor ? 'Update Doctor' : 'Add Doctor'}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
