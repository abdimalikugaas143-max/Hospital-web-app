import React, { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { patientsAPI } from '../../api/patients';
import { appointmentsAPI } from '../../api/appointments';
import { departmentsAPI } from '../../api/departments';
import { doctorsAPI } from '../../api/doctors';

export default function RegisterPatient() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [slots, setSlots] = useState([]);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', gender: '', date_of_birth: '', blood_type: '', address: '',
    bookAppointment: false,
    department_id: '', doctor_id: '', appointment_date: '', appointment_time: '', symptoms: '',
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setError('');

    if (name === 'bookAppointment' && checked) {
      departmentsAPI.getAll().then(({ data }) => setDepartments(data.departments)).catch(console.error);
    }
    if (name === 'department_id' && value) {
      doctorsAPI.getAll({ department_id: value }).then(({ data }) => setDoctors(data.doctors)).catch(console.error);
    }
    if (name === 'doctor_id' && value && form.appointment_date) {
      doctorsAPI.getAvailableSlots(value, form.appointment_date).then(({ data }) => setSlots(data.slots)).catch(console.error);
    }
    if (name === 'appointment_date' && form.doctor_id) {
      doctorsAPI.getAvailableSlots(form.doctor_id, value).then(({ data }) => setSlots(data.slots)).catch(console.error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone) { setError('Name and phone are required'); return; }
    setLoading(true);
    setError('');

    try {
      const { data } = await patientsAPI.registerWalkIn({
        name: form.name, phone: form.phone, email: form.email || undefined,
        gender: form.gender || undefined, date_of_birth: form.date_of_birth || undefined,
        blood_type: form.blood_type || undefined, address: form.address || undefined,
      });

      let appointmentData = null;
      if (form.bookAppointment && form.doctor_id && form.department_id && form.appointment_date && form.appointment_time) {
        try {
          const apptRes = await appointmentsAPI.book({
            patient_id: data.patient.id,
            doctor_id: form.doctor_id,
            department_id: form.department_id,
            appointment_date: form.appointment_date,
            appointment_time: form.appointment_time,
            symptoms: form.symptoms,
          });
          appointmentData = apptRes.data.appointment;
        } catch (apptErr) {
          setError(`Patient registered but appointment failed: ${apptErr.response?.data?.error || 'Unknown error'}`);
        }
      }

      setSuccess({ patient: data.patient, tempPassword: data.tempPassword, appointment: appointmentData });
      setStep(2);
    } catch (err) {
      const e = err.response?.data?.error;
      setError(typeof e === 'string' ? e : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSuccess(null);
    setStep(1);
    setForm({
      name: '', phone: '', email: '', gender: '', date_of_birth: '', blood_type: '', address: '',
      bookAppointment: false, department_id: '', doctor_id: '', appointment_date: '', appointment_time: '', symptoms: '',
    });
    setDoctors([]);
    setSlots([]);
  };

  const handlePrint = () => window.print();

  if (step === 2 && success) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-2xl">
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Patient Registered!</h2>
              <p className="text-gray-500 text-sm mt-1">Patient card has been created successfully</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-5 space-y-3 mb-6 no-print-hide" id="patient-card">
              <div className="flex items-center justify-between border-b pb-3 mb-2">
                <span className="font-bold text-primary-600 text-lg">MedCare Hospital</span>
                <span className="text-xs text-gray-400">Patient Card</span>
              </div>
              {[
                { label: 'Patient Name', value: success.patient.name },
                { label: 'Card Number', value: success.patient.card_number },
                { label: 'Phone', value: success.patient.phone },
                { label: 'Gender', value: success.patient.gender || 'N/A' },
                { label: 'Blood Type', value: success.patient.blood_type || 'N/A' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className="text-sm font-semibold text-gray-900">{value}</span>
                </div>
              ))}
              {success.tempPassword && (
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-sm text-gray-500">Temp Password</span>
                  <span className="text-sm font-mono font-bold text-red-600">{success.tempPassword}</span>
                </div>
              )}
            </div>

            {success.appointment && (
              <div className="bg-blue-50 rounded-xl p-5 mb-6">
                <p className="font-semibold text-blue-900 mb-3">Appointment Booked</p>
                {[
                  { label: 'Queue #', value: String(success.appointment.queue_number).padStart(3, '0') },
                  { label: 'Date', value: new Date(success.appointment.appointment_date).toLocaleDateString() },
                  { label: 'Time', value: success.appointment.appointment_time },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between mb-1.5">
                    <span className="text-sm text-blue-600">{label}</span>
                    <span className="text-sm font-semibold text-blue-900">{value}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={handlePrint} className="btn-primary flex-1 flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Card
              </button>
              <button onClick={handleReset} className="btn-secondary flex-1">Register Another</button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Register Walk-in Patient</h1>
          <p className="text-sm text-gray-500 mt-1">Create a new patient card and optionally book an appointment</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3 mb-5">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          {/* Patient info */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 text-sm uppercase tracking-wide text-gray-500">Patient Information</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Full Name *</label>
                  <input name="name" value={form.name} onChange={handleChange} className="input-field" placeholder="Patient full name" required />
                </div>
                <div>
                  <label className="label">Phone *</label>
                  <input name="phone" value={form.phone} onChange={handleChange} className="input-field" placeholder="+1 234 567 8900" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Email</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} className="input-field" placeholder="Optional" />
                </div>
                <div>
                  <label className="label">Date of Birth</label>
                  <input name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange} className="input-field" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Gender</label>
                  <select name="gender" value={form.gender} onChange={handleChange} className="input-field">
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">Blood Type</label>
                  <select name="blood_type" value={form.blood_type} onChange={handleChange} className="input-field">
                    <option value="">Select</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Address</label>
                <input name="address" value={form.address} onChange={handleChange} className="input-field" placeholder="Patient home address" />
              </div>
            </div>
          </div>

          {/* Appointment toggle */}
          <div className="border-t pt-5">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" name="bookAppointment" checked={form.bookAppointment} onChange={handleChange}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              <span className="font-medium text-gray-900">Also book an appointment for this patient</span>
            </label>
          </div>

          {/* Appointment fields */}
          {form.bookAppointment && (
            <div className="space-y-4 bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 text-sm">Appointment Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Department</label>
                  <select name="department_id" value={form.department_id} onChange={handleChange} className="input-field">
                    <option value="">Select department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Doctor</label>
                  <select name="doctor_id" value={form.doctor_id} onChange={handleChange} className="input-field" disabled={!form.department_id}>
                    <option value="">Select doctor</option>
                    {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Date</label>
                  <input name="appointment_date" type="date" value={form.appointment_date} onChange={handleChange} className="input-field"
                    min={new Date().toISOString().split('T')[0]} />
                </div>
                <div>
                  <label className="label">Time Slot</label>
                  <select name="appointment_time" value={form.appointment_time} onChange={handleChange} className="input-field" disabled={slots.length === 0}>
                    <option value="">Select time</option>
                    {slots.filter(s => s.available).map(s => <option key={s.time} value={s.time}>{s.displayTime}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Symptoms</label>
                <textarea name="symptoms" value={form.symptoms} onChange={handleChange} className="input-field" rows={2} placeholder="Patient symptoms..." />
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Registering...' : 'Register Patient'}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
