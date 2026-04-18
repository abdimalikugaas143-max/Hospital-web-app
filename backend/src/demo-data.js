// In-memory demo store — used when DATABASE_URL is missing (e.g. fresh Vercel deployment).
// Real DB takes over the moment DATABASE_URL is set.
const bcrypt = require('bcryptjs');

// Pre-computed hashes for demo passwords
// admin123, receptionist123, patient123, doctor123
const DEMO_USERS = [
  {
    id: 'demo-admin-001',
    name: 'System Admin',
    email: 'admin@hospital.com',
    password_hash: '$2a$12$vNYt9nlE448GCZbfz65GI.z0wd6GYVgBaL9E7ChtAbG50FqPwp8yG',
    role: 'admin',
    phone: '+1234567890',
    is_active: true,
  },
  {
    id: 'demo-receptionist-001',
    name: 'Sarah Johnson',
    email: 'receptionist@hospital.com',
    password_hash: '$2a$12$h8rF0qe6DvWjsKYWqyuzwuVZi653/WTrkG0isFFfBwvrlJmZQ56Pa',
    role: 'receptionist',
    phone: '+1234567891',
    is_active: true,
  },
  {
    id: 'demo-patient-001',
    name: 'John Doe',
    email: 'patient@hospital.com',
    password_hash: '$2a$12$umn4WUmer/dcbRn3u2NhBu4OmbNLuaqU.pooKWwNjif6tsnc7WQxu',
    role: 'patient',
    phone: '+1234567892',
    is_active: true,
  },
  {
    id: 'demo-doctor-001',
    name: 'Dr. Emily Chen',
    email: 'dr.chen@hospital.com',
    password_hash: '$2a$12$0RjcapC3TIeDHIQ.bhD3Ne0LXcI/8pbjT766y/9QncthxFn.pOzJa',
    role: 'doctor',
    phone: '+1234567893',
    is_active: true,
  },
];

const DEMO_DEPARTMENTS = [
  { id: 'dept-001', name: 'General Medicine', description: 'General healthcare and primary care', is_active: true, doctor_count: '1' },
  { id: 'dept-002', name: 'Cardiology', description: 'Heart and cardiovascular diseases', is_active: true, doctor_count: '1' },
  { id: 'dept-003', name: 'Pediatrics', description: 'Healthcare for children', is_active: true, doctor_count: '0' },
  { id: 'dept-004', name: 'Orthopedics', description: 'Bone, joint and muscle disorders', is_active: true, doctor_count: '0' },
  { id: 'dept-005', name: 'Dermatology', description: 'Skin conditions and diseases', is_active: true, doctor_count: '0' },
];

const DEMO_DOCTORS = [
  {
    id: 'doctor-001',
    user_id: 'demo-doctor-001',
    name: 'Dr. Emily Chen',
    email: 'dr.chen@hospital.com',
    department_id: 'dept-001',
    department_name: 'General Medicine',
    specialization: 'General Practitioner',
    bio: 'Experienced GP with 10 years of practice.',
    available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    is_active: true,
  },
];

const demoMode = !process.env.DATABASE_URL;

async function findUserByEmail(email) {
  return DEMO_USERS.find(u => u.email === email) || null;
}

async function findUserById(id) {
  return DEMO_USERS.find(u => u.id === id) || null;
}

async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

function getDoctorExtra(userId) {
  const doc = DEMO_DOCTORS.find(d => d.user_id === userId);
  if (!doc) return null;
  return {
    id: doc.id,
    department_id: doc.department_id,
    specialization: doc.specialization,
    departmentName: doc.department_name,
  };
}

function getPatientExtra(userId) {
  if (userId === 'demo-patient-001') {
    return { id: 'patient-001', card_number: 'HC-000001' };
  }
  return null;
}

module.exports = {
  demoMode,
  findUserByEmail,
  findUserById,
  verifyPassword,
  getDoctorExtra,
  getPatientExtra,
  DEMO_DEPARTMENTS,
  DEMO_DOCTORS,
  DEMO_USERS,
};
