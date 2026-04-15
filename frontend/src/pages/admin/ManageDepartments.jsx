import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import { departmentsAPI } from '../../api/departments';

export default function ManageDepartments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editDept, setEditDept] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', description: '' });

  useEffect(() => {
    departmentsAPI.getAll()
      .then(({ data }) => setDepartments(data.departments || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const openAdd = () => {
    setEditDept(null);
    setForm({ name: '', description: '' });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (dept) => {
    setEditDept(dept);
    setForm({ name: dept.name, description: dept.description || '' });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name) { setError('Department name is required'); return; }
    setSaving(true);
    setError('');
    try {
      if (editDept) {
        await departmentsAPI.update(editDept.id, form);
        setDepartments(prev => prev.map(d => d.id === editDept.id ? { ...d, ...form } : d));
      } else {
        const { data } = await departmentsAPI.create(form);
        setDepartments(prev => [...prev, data.department]);
      }
      setModalOpen(false);
    } catch (err) {
      const e = err.response?.data?.error;
      setError(typeof e === 'string' ? e : 'Failed to save department');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Deactivate this department?')) return;
    try {
      await departmentsAPI.delete(id);
      setDepartments(prev => prev.map(d => d.id === id ? { ...d, is_active: false } : d));
    } catch (err) {
      const e = err.response?.data?.error;
      alert(typeof e === 'string' ? e : 'Failed to deactivate');
    }
  };

  const deptIcons = {
    'General Medicine': '🩺', 'Cardiology': '❤️', 'Pediatrics': '👶',
    'Orthopedics': '🦴', 'Dermatology': '🌿', 'Neurology': '🧠',
    'Gynecology': '🌸', 'Ophthalmology': '👁️',
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Departments</h1>
            <p className="text-sm text-gray-500 mt-1">{departments.length} departments</p>
          </div>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Department
          </button>
        </div>

        {loading ? <LoadingSpinner text="Loading..." /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept) => (
              <div key={dept.id} className={`bg-white rounded-xl border-2 p-5 transition-all ${dept.is_active ? 'border-gray-200 hover:border-primary-200' : 'border-gray-100 opacity-50'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{deptIcons[dept.name] || '🏥'}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{dept.name}</h3>
                      <p className="text-xs text-gray-400">{dept.doctor_count || 0} doctor{dept.doctor_count !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${dept.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {dept.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{dept.description || 'No description'}</p>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(dept)} className="flex-1 text-sm text-primary-600 font-medium border border-primary-200 py-1.5 rounded-lg hover:bg-primary-50 transition-colors">
                    Edit
                  </button>
                  {dept.is_active && (
                    <button onClick={() => handleDeactivate(dept.id)} className="flex-1 text-sm text-red-600 font-medium border border-red-200 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                      Deactivate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editDept ? 'Edit Department' : 'Add Department'}>
        <form onSubmit={handleSave} className="space-y-4">
          {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}
          <div>
            <label className="label">Department Name *</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="input-field"
              placeholder="e.g. Cardiology"
              required
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="input-field"
              rows={3}
              placeholder="Brief description of the department..."
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : editDept ? 'Update' : 'Create Department'}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
