import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';

const features = [
  { icon: '📅', title: 'Book Appointments', desc: 'Schedule appointments with specialist doctors online in minutes' },
  { icon: '🏥', title: 'Multiple Departments', desc: 'Access Cardiology, Pediatrics, Orthopedics, and more' },
  { icon: '📱', title: 'Digital Patient Card', desc: 'Get your unique hospital card number instantly upon registration' },
  { icon: '🔔', title: 'Real-time Queue', desc: 'Track your queue position and estimated waiting time live' },
  { icon: '📋', title: 'Medical Records', desc: 'Access your complete medical history and prescriptions' },
  { icon: '🎫', title: 'QR Code Tickets', desc: 'Download and print your appointment ticket with QR code' },
];

const departments = [
  { name: 'General Medicine', icon: '🩺', color: 'from-blue-500 to-blue-600' },
  { name: 'Cardiology', icon: '❤️', color: 'from-red-500 to-red-600' },
  { name: 'Pediatrics', icon: '👶', color: 'from-yellow-500 to-yellow-600' },
  { name: 'Orthopedics', icon: '🦴', color: 'from-gray-500 to-gray-600' },
  { name: 'Dermatology', icon: '🌿', color: 'from-green-500 to-green-600' },
  { name: 'Neurology', icon: '🧠', color: 'from-purple-500 to-purple-600' },
  { name: 'Gynecology', icon: '🌸', color: 'from-pink-500 to-pink-600' },
  { name: 'Ophthalmology', icon: '👁️', color: 'from-indigo-500 to-indigo-600' },
];

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-700 via-primary-600 to-blue-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white bg-opacity-20 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              Now accepting online appointments
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
              Your Health,
              <br />
              <span className="text-blue-200">Our Priority</span>
            </h1>
            <p className="text-lg md:text-xl text-blue-100 mb-10 max-w-2xl">
              Book appointments with top specialists, manage your patient card, and track your queue position — all in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              {user ? (
                <Link to="/book-appointment" className="inline-flex items-center justify-center gap-2 bg-white text-primary-700 font-semibold px-8 py-3.5 rounded-xl hover:bg-blue-50 transition-colors text-base shadow-lg">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Book an Appointment
                </Link>
              ) : (
                <>
                  <Link to="/register" className="inline-flex items-center justify-center gap-2 bg-white text-primary-700 font-semibold px-8 py-3.5 rounded-xl hover:bg-blue-50 transition-colors text-base shadow-lg">
                    Get Started Free
                  </Link>
                  <Link to="/login" className="inline-flex items-center justify-center gap-2 bg-transparent border-2 border-white text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white hover:text-primary-700 transition-all text-base">
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
        {/* Wave */}
        <div className="overflow-hidden">
          <svg viewBox="0 0 1200 80" xmlns="http://www.w3.org/2000/svg" className="w-full h-12 text-white fill-current">
            <path d="M0,40 C200,80 400,0 600,40 C800,80 1000,0 1200,40 L1200,80 L0,80 Z" />
          </svg>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white py-8 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: '10,000+', label: 'Patients Served' },
              { value: '50+', label: 'Specialist Doctors' },
              { value: '8', label: 'Departments' },
              { value: '98%', label: 'Satisfaction Rate' },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-3xl font-extrabold text-primary-600">{value}</p>
                <p className="text-sm text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Everything You Need</h2>
            <p className="text-gray-500 max-w-xl mx-auto">A complete hospital management experience designed around patient convenience</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon, title, desc }) => (
              <div key={title} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="text-3xl mb-3">{icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Departments */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Departments</h2>
            <p className="text-gray-500">Specialized care across all major medical disciplines</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {departments.map(({ name, icon, color }) => (
              <div key={name} className={`bg-gradient-to-br ${color} text-white rounded-xl p-5 text-center hover:scale-105 transition-transform cursor-pointer shadow-sm`}>
                <div className="text-3xl mb-2">{icon}</div>
                <p className="text-sm font-semibold">{name}</p>
              </div>
            ))}
          </div>
          {!user && (
            <div className="text-center mt-10">
              <Link to="/register" className="btn-primary px-8 py-3 text-base inline-block rounded-xl">
                Register & Book Now
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      {!user && (
        <section className="bg-primary-600 py-16">
          <div className="max-w-2xl mx-auto text-center px-4">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
            <p className="text-blue-100 mb-8">Register today and get your unique hospital patient card instantly</p>
            <Link to="/register" className="inline-flex items-center gap-2 bg-white text-primary-700 font-semibold px-8 py-3.5 rounded-xl hover:bg-blue-50 transition-colors">
              Create Free Account
            </Link>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm">© 2025 MedCare Hospital. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
