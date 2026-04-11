import React, { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { patientsAPI } from '../../api/patients';
import { appointmentsAPI } from '../../api/appointments';
import StatusBadge from '../../components/StatusBadge';

export default function SearchPatient() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    setSelected(null);
    try {
      const { data } = await patientsAPI.search(query);
      setResults(data.patients);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (patient) => {
    setSelected(patient);
    setLoading(true);
    try {
      const { data } = await appointmentsAPI.getAll({ patient_id: patient.id });
      setAppointments(data.appointments);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : 'N/A';
  const formatTime = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hour = parseInt(h);
    return `${hour > 12 ? hour - 12 : hour}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Search Patient</h1>
          <p className="text-sm text-gray-500 mt-1">Find patients by name, phone number, or card number</p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-3 mb-6">
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSearched(false); }}
            placeholder="Search by name, phone, or card number (e.g. HC-000001)..."
            className="input-field flex-1 text-sm"
          />
          <button type="submit" disabled={loading} className="btn-primary px-6 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Results list */}
          <div>
            {searched && (
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="px-5 py-3 border-b border-gray-100">
                  <p className="font-semibold text-gray-900">
                    {results.length === 0 ? 'No patients found' : `${results.length} patient${results.length !== 1 ? 's' : ''} found`}
                  </p>
                </div>
                {results.length === 0 ? (
                  <div className="py-12 text-center text-gray-400">
                    <p className="text-4xl mb-2">🔍</p>
                    <p className="text-sm">Try a different search term</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                    {results.map((patient) => (
                      <button key={patient.id} onClick={() => handleSelect(patient)}
                        className={`w-full text-left px-5 py-3 hover:bg-gray-50 transition-colors ${selected?.id === patient.id ? 'bg-primary-50 border-l-4 border-primary-500' : ''}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{patient.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{patient.phone}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-mono text-primary-600 font-bold">{patient.card_number}</p>
                            <p className="text-xs text-gray-400">{patient.gender || '—'} · {patient.blood_type || '—'}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Patient detail */}
          {selected && (
            <div className="space-y-4">
              {/* Patient card */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-600 text-xl shrink-0">
                    {selected.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">{selected.name}</h3>
                    <p className="text-xs text-gray-500">{selected.email}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-400">Card #</span>
                        <p className="font-mono font-bold text-primary-600">{selected.card_number}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Phone</span>
                        <p className="font-medium">{selected.phone}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Gender</span>
                        <p className="font-medium capitalize">{selected.gender || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Blood Type</span>
                        <p className="font-medium text-red-600">{selected.blood_type || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Date of Birth</span>
                        <p className="font-medium">{selected.date_of_birth ? formatDate(selected.date_of_birth) : 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Appointments */}
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="px-5 py-3 border-b border-gray-100">
                  <p className="font-semibold text-gray-900 text-sm">Appointment History</p>
                </div>
                {loading ? (
                  <p className="text-center text-gray-400 py-6 text-sm">Loading...</p>
                ) : appointments.length === 0 ? (
                  <p className="text-center text-gray-400 py-6 text-sm">No appointments found</p>
                ) : (
                  <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                    {appointments.map((appt) => (
                      <div key={appt.id} className="px-5 py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{appt.doctor_name}</p>
                            <p className="text-xs text-gray-500">{formatDate(appt.appointment_date)} · {formatTime(appt.appointment_time)}</p>
                          </div>
                          <div className="text-right">
                            <StatusBadge status={appt.status} />
                            <p className="text-xs text-gray-400 mt-0.5">Q# {appt.queue_number}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
