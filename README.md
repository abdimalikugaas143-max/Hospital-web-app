# MedCare Hospital - Patient Card & Appointment Booking System

A production-ready, full-stack Hospital Management SaaS application.

## Features

### Patient
- Register & login with unique hospital card number
- Book appointments (Department → Doctor → Date → Time slot)
- Duplicate booking prevention
- View & cancel appointments
- Download QR code appointment ticket

### Receptionist
- Register walk-in patients with auto-generated card numbers
- Book appointments for walk-ins
- Real-time queue management (call/complete patients)
- Search patients by name, phone, or card number

### Doctor
- View daily patient list
- Access patient details and medical history
- Record diagnosis, prescription, and treatment
- Mark consultations as complete

### Admin
- Manage doctors and departments
- View hospital statistics with charts
- Generate appointment reports (CSV export)
- Doctor performance analytics

## Tech Stack

- **Frontend**: React 18, TailwindCSS, React Router v6, Axios, Socket.io-client, Recharts
- **Backend**: Node.js, Express.js, Socket.io
- **Database**: PostgreSQL
- **Auth**: JWT with role-based access control
- **Real-time**: Socket.io for live queue updates
- **QR**: react-qr-code for appointment tickets

## Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### Setup

1. **Clone and install**
```bash
git clone <repo-url>
cd Hospital-web-app

cd backend && npm install
cd ../frontend && npm install
```

2. **Configure backend environment**
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your PostgreSQL connection string
```

3. **Run database schema and seed**
```bash
cd backend
npm run seed
```

4. **Start backend**
```bash
cd backend
npm run dev
# Runs on http://localhost:5000
```

5. **Start frontend** (in a new terminal)
```bash
cd frontend
npm run dev
# Runs on http://localhost:5173
```

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@hospital.com | admin123 |
| Receptionist | receptionist@hospital.com | receptionist123 |
| Doctor | dr.chen@hospital.com | doctor123 |
| Patient | patient@hospital.com | patient123 |

## Deployment (Vercel)

### Option 1: Separate deployments (Recommended)

**Backend on Railway/Render:**
1. Create new service from GitHub repo
2. Set root directory to `backend/`
3. Add environment variables (DATABASE_URL, JWT_SECRET, CLIENT_URL, NODE_ENV=production)

**Frontend on Vercel:**
1. Import repo on Vercel
2. Set root directory to `frontend/`
3. Add `VITE_API_URL=https://your-backend.railway.app/api`

### Option 2: Vercel monorepo (see vercel.json)

### Environment Variables

**Backend:**
```
PORT=5000
DATABASE_URL=postgresql://...
JWT_SECRET=your_secret_here
JWT_EXPIRES_IN=7d
CLIENT_URL=https://your-frontend.vercel.app
NODE_ENV=production
```

**Frontend:**
```
VITE_API_URL=https://your-backend.railway.app/api
```

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/auth/register | Patient registration | Public |
| POST | /api/auth/login | Login all roles | Public |
| GET | /api/auth/me | Get current user | Any |
| GET | /api/departments | List departments | Public |
| GET | /api/doctors | List doctors | Public |
| GET | /api/doctors/:id/available-slots | Available time slots | Public |
| POST | /api/appointments | Book appointment | Patient/Receptionist |
| GET | /api/appointments | List appointments | Any |
| GET | /api/appointments/today | Today's appointments | Staff |
| PUT | /api/appointments/:id/cancel | Cancel appointment | Patient/Staff |
| PUT | /api/appointments/:id/status | Update status | Doctor/Staff |
| GET | /api/queue/today | Today's queue | Staff |
| PUT | /api/queue/:id/call | Call patient | Staff |
| PUT | /api/queue/:id/complete | Complete queue entry | Staff |
| POST | /api/patients/walk-in | Register walk-in | Receptionist |
| GET | /api/patients/search | Search patients | Staff |
| GET | /api/reports/stats | Dashboard stats | Admin |
| GET | /api/reports/appointments | Appointment report | Admin |
| GET | /api/reports/doctors | Doctor performance | Admin |

## Database Schema

Tables: `users`, `patients`, `departments`, `doctors`, `time_slots`, `appointments`, `queue`, `medical_records`

See `backend/src/config/schema.sql` for full schema.
