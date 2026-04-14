import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import QRTicket from '../../components/QRTicket';
import { departmentsAPI } from '../../api/departments';
import { doctorsAPI } from '../../api/doctors';
import { appointmentsAPI } from '../../api/appointments';

const steps = ['Department', 'Doctor', 'Date & Time', 'Confirm'];

function getTomorrowDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function getMinDate() {
  return new Date().toISOString().split('T')[0];
}

export default function BookAppointment() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [error, setError] = useState('');
  const [bookedAppointment, setBookedAppointment] = useState(null);
  const [showTicket, setShowTicket] = useState(false);
  const [form, setForm] = useState({
    department_id: '', department_name: '',
    doctor_id: '', doctor_name: '',
    appointment_date: getTomorrowDate(),
    appointment_time: '',
    symptoms: '',
    notes: '',
  });

  useEffect(() => {
    departmentsAPI.getAll().then(({ data }) => setDepartments(data?.departments || [])).catch(console.error);
  }, []);

  const handleSelectDepartment = async (dept) => {
    setForm(f => ({ ...f, department_id: dept.id, department_name: dept.name, doctor_id: '', doctor_name: '' }));
    setLoading(true);
    try {
      const { data } = await doctorsAPI.getAll({ department_id: dept.id });
      setDoctors(data?.doctors || []);
      setStep(1);
    } catch { setError('Failed to load doctors'); }
    finally { setLoading(false); }
  };

  const handleSelectDoctor = (doc) => {
    setForm(f => ({ ...f, doctor_id: doc.id, doctor_name: doc.name, appointment_time: '' }));
    setStep(2);
    loadSlots(doc.id, form.appointment_date);
  };

  const loadSlots = async (doctorId, date) => {
    if (!doctorId || !date) return;
    setSlotsLoading(true);
    try {
      const { data } = await doctorsAPI.getAvailableSlots(doctorId, date);
      setSlots(data?.slots || []);
    } catch { setError('Failed to load time slots'); }
    finally { setSlotsLoading(false); }
  };

  const handleDateChange = (e) => {
    const date = e.target.value;
    setForm(f => ({ ...f, appointment_date: date, appointment_time: '' }));
    if (form.doctor_id) loadSlots(form.doctor_id, date);
  };

  const handleTimeSelect = (slot) => {
    if (!slot.available) return;
    setForm(f => ({ ...f, appointment_time: slot.time }));
    setStep(3);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    let bookedData = null;
    try {
      const { data } = await appointmentsAPI.book({
        doctor_id: form.doctor_id,
        department_id: form.department_id,
        appointment_date: form.appointment_date,
        appointment_time: form.appointment_time,
        symptoms: form.symptoms,
        notes: form.notes,
      });
      bookedData = data.appointment;
    } catch (err) {
      setError(err.response?.data?.error || 'Booking failed. Please try again.');
      setLoading(false);
      return;
    }

    // Fetch full details (QR code, doctor info) — fall back to booking response if this fails
    try {
      const apptDetail = await appointmentsAPI.getById(bookedData.id);
      setBookedAppointment(apptDetail.data.appointment);
    } catch {
      setBookedAppointment({ ...bookedData, doctor_name: form.doctor_name, department_name: form.department_name });
    }
    setShowTicket(true);
    setLoading(false);
  };

  const formatTime = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hour = parseInt(h);
    return `${hour > 12 ? hour - 12 : hour}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Book Appointment</h1>
          <p className="text-sm text-gray-500">Follow the steps to schedule your visit</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center mb-8">
          {steps.map((s, i) => (
            <React.Fragment key={s}>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  i < step ? 'bg-green-500 text-white' :
                  i === step ? 'bg-primary-600 text-white' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`text-sm font-medium hidden sm:block ${i === step ? 'text-primary-600' : 'text-gray-400'}`}>{s}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
            <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* Step 0: Choose Department */}
        {step === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Select Department</h2>
            {departments.length === 0 ? (
              <LoadingSpinner size="md" text="Loading departments..." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {departments.map((dept) => (
                  <button key={dept.id} onClick={() => handleSelectDepartment(dept)}
                    className="text-left p-4 border-2 border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition-all group">
                    <p className="font-semibold text-gray-900 group-hover:text-primary-600">{dept.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{dept.description}</p>
                    <p className="text-xs text-primary-500 mt-1">{dept.doctor_count} doctor{dept.doctor_count !== 1 ? 's' : ''} available</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 1: Choose Doctor */}
        {step === 1 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Select Doctor</h2>
              <button onClick={() => setStep(0)} className="text-sm text-primary-600 hover:underline">← Change Dept</button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Department: <span className="font-medium text-gray-700">{form.department_name}</span></p>
            {loading ? <LoadingSpinner size="md" text="Loading doctors..." /> : doctors.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">No doctors available in this department</p>
            ) : (
              <div className="space-y-3">
                {doctors.map((doc) => (
                  <button key={doc.id} onClick={() => handleSelectDoctor(doc)}
                    className="w-full text-left p-4 border-2 border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition-all flex items-center gap-4 group">
                    <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                      <span className="text-primary-600 font-bold text-lg">{doc.name?.charAt(0)}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 group-hover:text-primary-600">{doc.name}</p>
                      <p className="text-sm text-gray-500">{doc.specialization}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Available: {doc.available_days?.join(', ')}</p>
                    </div>
                    {doc.consultation_fee > 0 && (
                      <span className="text-sm font-medium text-green-600">${doc.consultation_fee}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Date & Time */}
        {step === 2 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Select Date & Time</h2>
              <button onClick={() => setStep(1)} className="text-sm text-primary-600 hover:underline">← Change Doctor</button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Doctor: <span className="font-medium text-gray-700">{form.doctor_name}</span></p>

            <div className="mb-5">
              <label className="label">Appointment Date</label>
              <input
                type="date"
                value={form.appointment_date}
                min={getMinDate()}
                onChange={handleDateChange}
                className="input-field max-w-xs"
              />
            </div>

            <div>
              <label className="label mb-3">Available Time Slots</label>
              {slotsLoading ? (
                <LoadingSpinner size="md" text="Loading slots..." />
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {slots.map((slot) => (
                    <button
                      key={slot.time}
                      onClick={() => handleTimeSelect(slot)}
                      disabled={!slot.available}
                      className={`p-2.5 rounded-lg text-sm font-medium border-2 transition-all ${
                        !slot.available
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                          : form.appointment_time === slot.time
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-primary-400 hover:bg-primary-50'
                      }`}
                    >
                      {slot.displayTime}
                      {!slot.available && <p className="text-xs opacity-60">Booked</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {form.appointment_time && (
              <div className="mt-4">
                <label className="label">Symptoms / Reason for Visit</label>
                <textarea
                  value={form.symptoms}
                  onChange={(e) => setForm(f => ({ ...f, symptoms: e.target.value }))}
                  className="input-field"
                  rows={3}
                  placeholder="Describe your symptoms briefly..."
                />
              </div>
            )}
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-gray-900">Confirm Appointment</h2>
              <button onClick={() => setStep(2)} className="text-sm text-primary-600 hover:underline">← Edit</button>
            </div>

            <div className="bg-gray-50 rounded-xl p-5 space-y-3 mb-6">
              {[
                { label: 'Department', value: form.department_name },
                { label: 'Doctor', value: form.doctor_name },
                { label: 'Date', value: new Date(form.appointment_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
                { label: 'Time', value: formatTime(form.appointment_time) },
                { label: 'Symptoms', value: form.symptoms || 'Not specified' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-sm text-gray-500 w-28">{label}</span>
                  <span className="text-sm font-medium text-gray-900 text-right">{value}</span>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 rounded-lg p-4 mb-6 text-sm text-blue-700">
              <p className="font-medium mb-1">Important Notes:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-600">
                <li>Please arrive 15 minutes before your appointment time</li>
                <li>Bring your patient card and any previous medical records</li>
                <li>You can cancel up to 2 hours before the appointment</li>
              </ul>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary w-full py-3.5 text-base"
            >
              {loading ? 'Booking...' : 'Confirm Appointment'}
            </button>
          </div>
        )}
      </div>

      {/* QR Ticket modal */}
      {showTicket && bookedAppointment && (
        <QRTicket
          appointment={bookedAppointment}
          onClose={() => { setShowTicket(false); navigate('/appointments'); }}
        />
      )}
    </div>
  );
}
