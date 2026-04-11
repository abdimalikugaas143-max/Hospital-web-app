import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './routes/ProtectedRoute';

// Public pages
import Home from './pages/patient/Home';
import Register from './pages/patient/Register';
import Login from './pages/patient/Login';

// Patient pages
import BookAppointment from './pages/patient/BookAppointment';
import MyAppointments from './pages/patient/MyAppointments';

// Receptionist pages
import ReceptionistDashboard from './pages/receptionist/Dashboard';
import RegisterPatient from './pages/receptionist/RegisterPatient';
import QueueManagement from './pages/receptionist/QueueManagement';
import SearchPatient from './pages/receptionist/SearchPatient';

// Doctor pages
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import PatientList from './pages/doctor/PatientList';
import PatientDetails from './pages/doctor/PatientDetails';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageDoctors from './pages/admin/ManageDoctors';
import ManageDepartments from './pages/admin/ManageDepartments';
import Reports from './pages/admin/Reports';

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Home />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />

            {/* Patient */}
            <Route path="/book-appointment" element={
              <ProtectedRoute roles={['patient']}>
                <BookAppointment />
              </ProtectedRoute>
            } />
            <Route path="/appointments" element={
              <ProtectedRoute roles={['patient']}>
                <MyAppointments />
              </ProtectedRoute>
            } />

            {/* Receptionist */}
            <Route path="/receptionist" element={
              <ProtectedRoute roles={['receptionist', 'admin']}>
                <ReceptionistDashboard />
              </ProtectedRoute>
            } />
            <Route path="/receptionist/register-patient" element={
              <ProtectedRoute roles={['receptionist', 'admin']}>
                <RegisterPatient />
              </ProtectedRoute>
            } />
            <Route path="/receptionist/queue" element={
              <ProtectedRoute roles={['receptionist', 'admin']}>
                <QueueManagement />
              </ProtectedRoute>
            } />
            <Route path="/receptionist/search" element={
              <ProtectedRoute roles={['receptionist', 'admin']}>
                <SearchPatient />
              </ProtectedRoute>
            } />

            {/* Doctor */}
            <Route path="/doctor" element={
              <ProtectedRoute roles={['doctor', 'admin']}>
                <DoctorDashboard />
              </ProtectedRoute>
            } />
            <Route path="/doctor/patients" element={
              <ProtectedRoute roles={['doctor', 'admin']}>
                <PatientList />
              </ProtectedRoute>
            } />
            <Route path="/doctor/patients/:patientId" element={
              <ProtectedRoute roles={['doctor', 'admin']}>
                <PatientDetails />
              </ProtectedRoute>
            } />

            {/* Admin */}
            <Route path="/admin" element={
              <ProtectedRoute roles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/doctors" element={
              <ProtectedRoute roles={['admin']}>
                <ManageDoctors />
              </ProtectedRoute>
            } />
            <Route path="/admin/departments" element={
              <ProtectedRoute roles={['admin']}>
                <ManageDepartments />
              </ProtectedRoute>
            } />
            <Route path="/admin/reports" element={
              <ProtectedRoute roles={['admin']}>
                <Reports />
              </ProtectedRoute>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}
