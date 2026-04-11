import React, { useRef } from 'react';
import QRCode from 'react-qr-code';
import { useReactToPrint } from 'react-to-print';

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h);
  return `${hour > 12 ? hour - 12 : hour}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

export default function QRTicket({ appointment, onClose }) {
  const ticketRef = useRef();

  const handlePrint = useReactToPrint({
    content: () => ticketRef.current,
    documentTitle: `Appointment-${appointment?.id?.slice(0, 8)}`,
  });

  if (!appointment) return null;

  const qrValue = JSON.stringify({
    id: appointment.id,
    patient: appointment.patient_name,
    card: appointment.card_number,
    date: appointment.appointment_date,
    time: appointment.appointment_time,
    queue: appointment.queue_number,
    doctor: appointment.doctor_name,
    dept: appointment.department_name,
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Actions */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0 no-print">
          <h3 className="text-lg font-bold text-gray-900">Appointment Ticket</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="btn-primary text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Ticket content (printable) */}
        <div ref={ticketRef} className="p-6">
          {/* Hospital header */}
          <div className="text-center border-b-2 border-primary-600 pb-4 mb-4">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-primary-600">MedCare Hospital</h1>
            </div>
            <p className="text-xs text-gray-500">Patient Appointment Ticket</p>
          </div>

          {/* Queue number highlight */}
          <div className="bg-primary-600 text-white rounded-xl p-4 text-center mb-4">
            <p className="text-xs font-medium opacity-80 uppercase tracking-wide">Queue Number</p>
            <p className="text-5xl font-bold my-1">{String(appointment.queue_number).padStart(3, '0')}</p>
            <p className="text-xs opacity-80">{appointment.department_name}</p>
          </div>

          {/* Details */}
          <div className="space-y-2.5 mb-4">
            {[
              { label: 'Patient Name', value: appointment.patient_name },
              { label: 'Card Number', value: appointment.card_number },
              { label: 'Doctor', value: appointment.doctor_name },
              { label: 'Department', value: appointment.department_name },
              { label: 'Date', value: formatDate(appointment.appointment_date) },
              { label: 'Time', value: formatTime(appointment.appointment_time) },
              { label: 'Status', value: appointment.status?.toUpperCase() },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-start">
                <span className="text-xs text-gray-500 w-28 shrink-0">{label}</span>
                <span className="text-xs font-medium text-gray-900 text-right">{value}</span>
              </div>
            ))}
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center pt-4 border-t border-gray-200">
            <QRCode
              value={qrValue}
              size={120}
              style={{ height: 'auto', maxWidth: '120px', width: '120px' }}
            />
            <p className="text-xs text-gray-400 mt-2">Scan for appointment details</p>
            <p className="text-xs text-gray-400">ID: {appointment.id?.slice(0, 12)}...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
