import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import { patientsAPI } from '../../api/patients';
import { appointmentsAPI } from '../../api/appointments';

export default function PatientDetails() {
  const { patientId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const appointmentId = location.state?.appointmentId;

  const [patient, setPatient] = useState(null);
  const [appointment, setAppointment] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [diagnosis, setDiagnosis] = useState({ diagnosis: '', prescription: '', treatment: '', notes: '', follow_up_date: '' });

  useEffect(() => {
    fetchData();
  }, [patientId]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [patientRes, recordsRes] = await Promise.all([
        patientsAPI.getById(patientId),
        patientsAPI.getMedicalRecords(patientId),
      ]);
      setPatient(patientRes.data.patient);
      setRecords(recordsRes.data.records);

      if (appointmentId) {
        const apptRes = await appointmentsAPI.getById(appointmentId);
        setAppointment(apptRes.data.appointment);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load patient data. Please go back and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!diagnosis.diagnosis) { setError('Please enter a diagnosis'); return; }
    setSaving(true);
    setError('');
    try {
      await appointmentsAPI.updateStatus(appointmentId, {
        status: 'completed',
        ...diagnosis,
      });
      setSuccess('Patient marked as completed!');
      setTimeout(() => navigate('/doctor/patients'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to complete');
    } finally {
      setSaving(false);
    }
  };

  const handleInProgress = async () => {
    try {
      await appointmentsAPI.updateStatus(appointmentId, { status: 'in_progress' });
      if (appointment) setAppointment({ ...appointment, status: 'in_progress' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update');
    }
  };

  if (loading) return <DashboardLayout><div className="p-6"><LoadingSpinner text="Loading patient..." /></div></DashboardLayout>;

  if (!patient) return (
    <DashboardLayout>
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-700 flex items-center justify-between">
          <span>{error || 'Patient not found.'}</span>
          <button onClick={() => navigate(-1)} className="text-sm font-medium underline">Go Back</button>
        </div>
      </div>
    </DashboardLayout>
  );

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Patient Details</h1>
            <p className="text-sm text-gray-500">Card: {patient?.card_number}</p>
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}
        {success && <div className="bg-green-50 text-green-700 text-sm rounded-lg px-4 py-3 mb-4">{success}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Patient info */}
          <div className="lg:col-span-1 space-y-4">
            {/* Patient card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-600 text-xl">
                  {patient?.name?.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{patient?.name}</h3>
                  <p className="text-xs text-gray-400">{patient?.email}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                {[
                  { label: 'Card #', value: patient?.card_number },
                  { label: 'Phone', value: patient?.phone },
                  { label: 'DOB', value: formatDate(patient?.date_of_birth) },
                  { label: 'Gender', value: patient?.gender || 'N/A' },
                  { label: 'Blood Type', value: patient?.blood_type || 'N/A' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-gray-400">{label}</span>
                    <span className="font-medium text-gray-900">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Current appointment */}
            {appointment && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-3 text-sm">Current Appointment</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status</span>
                    <StatusBadge status={appointment.status} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Queue #</span>
                    <span className="font-bold text-primary-600">{String(appointment.queue_number).padStart(3, '0')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Time</span>
                    <span className="font-medium">{appointment.appointment_time?.slice(0, 5)}</span>
                  </div>
                </div>
                {appointment.symptoms && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-gray-400 mb-1">Symptoms</p>
                    <p className="text-sm text-gray-700">{appointment.symptoms}</p>
                  </div>
                )}
                {appointment.status === 'confirmed' && (
                  <button onClick={handleInProgress} className="btn-primary w-full mt-4 text-sm">
                    Start Consultation
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right: Diagnosis & records */}
          <div className="lg:col-span-2 space-y-4">
            {/* Diagnosis form */}
            {appointmentId && appointment && !['completed', 'cancelled'].includes(appointment.status) && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Consultation Notes</h3>
                <div className="space-y-4">
                  <div>
                    <label className="label">Diagnosis *</label>
                    <textarea
                      value={diagnosis.diagnosis}
                      onChange={e => setDiagnosis(d => ({ ...d, diagnosis: e.target.value }))}
                      className="input-field" rows={3}
                      placeholder="Enter diagnosis..."
                    />
                  </div>
                  <div>
                    <label className="label">Prescription</label>
                    <textarea
                      value={diagnosis.prescription}
                      onChange={e => setDiagnosis(d => ({ ...d, prescription: e.target.value }))}
                      className="input-field" rows={3}
                      placeholder="List medications and dosages..."
                    />
                  </div>
                  <div>
                    <label className="label">Treatment Plan</label>
                    <textarea
                      value={diagnosis.treatment}
                      onChange={e => setDiagnosis(d => ({ ...d, treatment: e.target.value }))}
                      className="input-field" rows={2}
                      placeholder="Treatment instructions..."
                    />
                  </div>
                  <div>
                    <label className="label">Doctor's Notes</label>
                    <textarea
                      value={diagnosis.notes}
                      onChange={e => setDiagnosis(d => ({ ...d, notes: e.target.value }))}
                      className="input-field" rows={2}
                      placeholder="Additional notes..."
                    />
                  </div>
                  <div>
                    <label className="label">Follow-up Date</label>
                    <input
                      type="date"
                      value={diagnosis.follow_up_date}
                      onChange={e => setDiagnosis(d => ({ ...d, follow_up_date: e.target.value }))}
                      className="input-field max-w-xs"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <button onClick={handleComplete} disabled={saving} className="btn-success w-full py-2.5">
                    {saving ? 'Saving...' : '✓ Complete & Save Record'}
                  </button>
                </div>
              </div>
            )}

            {/* Medical history */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Medical History ({records.length})</h3>
              </div>
              {records.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">No medical records yet</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {records.map((record) => (
                    <div key={record.id} className="px-5 py-4">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">{record.doctor_name}</span>
                        <span className="text-xs text-gray-400">{formatDate(record.created_at)}</span>
                      </div>
                      {record.diagnosis && <p className="text-sm text-gray-900 mb-1"><span className="font-medium">Dx:</span> {record.diagnosis}</p>}
                      {record.prescription && <p className="text-sm text-gray-600"><span className="font-medium">Rx:</span> {record.prescription}</p>}
                      {record.follow_up_date && <p className="text-xs text-orange-600 mt-1">Follow-up: {formatDate(record.follow_up_date)}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
