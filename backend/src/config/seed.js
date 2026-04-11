require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./db');
const fs = require('fs');
const path = require('path');

async function runSchema() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
  console.log('Schema created successfully');
}

async function seedData() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 12);
    const adminResult = await client.query(
      `INSERT INTO users (name, email, password_hash, role, phone)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      ['System Admin', 'admin@hospital.com', adminPassword, 'admin', '+1234567890']
    );
    console.log('Admin user created: admin@hospital.com / admin123');

    // Create departments
    const departments = [
      { name: 'General Medicine', description: 'Primary healthcare and general consultations' },
      { name: 'Cardiology', description: 'Heart and cardiovascular conditions' },
      { name: 'Pediatrics', description: 'Healthcare for infants, children and adolescents' },
      { name: 'Orthopedics', description: 'Bone, joint and muscle conditions' },
      { name: 'Dermatology', description: 'Skin, hair and nail conditions' },
      { name: 'Neurology', description: 'Brain and nervous system disorders' },
      { name: 'Gynecology', description: 'Women\'s reproductive health' },
      { name: 'Ophthalmology', description: 'Eye care and vision' },
    ];

    const deptIds = [];
    for (const dept of departments) {
      const result = await client.query(
        `INSERT INTO departments (name, description)
         VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
         RETURNING id`,
        [dept.name, dept.description]
      );
      deptIds.push(result.rows[0].id);
    }
    console.log('Departments seeded');

    // Create receptionist
    const receptionistPassword = await bcrypt.hash('receptionist123', 12);
    await client.query(
      `INSERT INTO users (name, email, password_hash, role, phone)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      ['Sarah Johnson', 'receptionist@hospital.com', receptionistPassword, 'receptionist', '+1234567891']
    );
    console.log('Receptionist created: receptionist@hospital.com / receptionist123');

    // Create doctors
    const doctorData = [
      { name: 'Dr. Michael Chen', email: 'dr.chen@hospital.com', phone: '+1234567892', dept: 0, spec: 'General Practice' },
      { name: 'Dr. Emily Rodriguez', email: 'dr.rodriguez@hospital.com', phone: '+1234567893', dept: 1, spec: 'Interventional Cardiology' },
      { name: 'Dr. James Wilson', email: 'dr.wilson@hospital.com', phone: '+1234567894', dept: 2, spec: 'Pediatric Medicine' },
      { name: 'Dr. Aisha Patel', email: 'dr.patel@hospital.com', phone: '+1234567895', dept: 3, spec: 'Sports Medicine & Orthopedics' },
    ];

    const doctorPassword = await bcrypt.hash('doctor123', 12);
    for (const doc of doctorData) {
      const userResult = await client.query(
        `INSERT INTO users (name, email, password_hash, role, phone)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [doc.name, doc.email, doctorPassword, 'doctor', doc.phone]
      );
      await client.query(
        `INSERT INTO doctors (user_id, department_id, specialization, bio)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id) DO NOTHING`,
        [userResult.rows[0].id, deptIds[doc.dept], doc.spec, `Experienced specialist in ${doc.spec}`]
      );
    }
    console.log('Doctors seeded (password: doctor123)');

    // Create a demo patient
    const patientPassword = await bcrypt.hash('patient123', 12);
    const patientUserResult = await client.query(
      `INSERT INTO users (name, email, password_hash, role, phone)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      ['John Doe', 'patient@hospital.com', patientPassword, 'patient', '+1234567896']
    );
    await client.query(
      `INSERT INTO patients (user_id, card_number, date_of_birth, gender, blood_type)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (card_number) DO NOTHING`,
      [patientUserResult.rows[0].id, 'HC-000001', '1990-01-15', 'male', 'O+']
    );
    console.log('Demo patient created: patient@hospital.com / patient123');

    await client.query('COMMIT');
    console.log('\nSeed completed successfully!');
    console.log('\nLogin credentials:');
    console.log('  Admin:       admin@hospital.com / admin123');
    console.log('  Receptionist: receptionist@hospital.com / receptionist123');
    console.log('  Doctor:      dr.chen@hospital.com / doctor123');
    console.log('  Patient:     patient@hospital.com / patient123');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed error:', err);
    throw err;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await runSchema();
    await seedData();
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
