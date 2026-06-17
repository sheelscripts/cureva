import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const MALE_NAMES = [
  'Rajesh', 'Rohan', 'Vikram', 'Amit', 'Sandeep', 'Rahul', 'Deepak', 'Sanjay', 
  'Manoj', 'Alok', 'Sunil', 'Anil', 'Harish', 'Naresh', 'Suresh', 'Ramesh', 
  'Arun', 'Vijay', 'Aditya', 'Abhishek', 'Karan', 'Arjun', 'Kabir', 'Dev', 
  'Manish', 'Raj', 'Gaurav', 'Vivek', 'Pranav', 'Rishi'
];

const FEMALE_NAMES = [
  'Priya', 'Anita', 'Ananya', 'Sunita', 'Kavita', 'Neha', 'Sneha', 'Pooja', 
  'Kiran', 'Divya', 'Ritu', 'Meena', 'Jyoti', 'Meera', 'Kavita', 'Rani', 
  'Shalini', 'Preeti', 'Swati', 'Asha', 'Lata', 'Geeta', 'Seema', 'Rekha', 
  'Kajal', 'Payal', 'Simran', 'Tanvi', 'Anjali', 'Aditi'
];

const LAST_NAMES = [
  'Sharma', 'Gupta', 'Verma', 'Patel', 'Iyer', 'Rao', 'Shah', 'Nair', 'Singh', 
  'Reddy', 'Joshi', 'Mehta', 'Kumar', 'Das', 'Sen', 'Mishra', 'Prasad', 'Bose', 
  'Choudhury', 'Dutta', 'Bannerjee', 'Chatterjee', 'Kulkarni', 'Deshmukh', 
  'Pillai', 'Menon', 'Bhat', 'Hegde', 'Shenoy', 'Gowda'
];

const CLINICAL_CONDITIONS = [
  'Hypertension Stage 1', 'Type 2 Diabetes', 'Hyperlipidemia', 'Gastroesophageal Reflux', 
  'Mild Depression', 'Vitamin D Deficiency', 'Iron Deficiency Anemia', 'Hypothyroidism', 
  'Asthma (Mild Intermittent)', 'Osteoarthritis Knee'
];

const DRUGS = [
  { name: 'Atorvastatin', strengths: ['10mg', '20mg'], category: 'Statin', instructions: 'Take after dinner. Avoid grapefruit juice.' },
  { name: 'Aspirin', strengths: ['75mg', '150mg'], category: 'Antiplatelet', instructions: 'Take with food. Do not crush.' },
  { name: 'Metformin', strengths: ['500mg', '850mg'], category: 'Antidiabetic', instructions: 'Take with or immediately after meals.' },
  { name: 'Amlodipine', strengths: ['5mg', '10mg'], category: 'Calcium Channel Blocker', instructions: 'Take at the same time each day, morning or night.' },
  { name: 'Omeprazole', strengths: ['20mg'], category: 'PPI', instructions: 'Take 30 minutes before breakfast on an empty stomach.' },
  { name: 'Levothyroxine', strengths: ['50mcg', '100mcg'], category: 'Thyroid Hormone', instructions: 'Take first thing in the morning on an empty stomach, 1 hour before tea/coffee.' },
  { name: 'Pantoprazole', strengths: ['40mg'], category: 'PPI', instructions: 'Take 30 minutes before breakfast.' },
  { name: 'Paracetamol', strengths: ['650mg'], category: 'Analgesic', instructions: 'Take as needed for pain or fever. Max 4 tablets a day.' },
  { name: 'Losartan', strengths: ['50mg'], category: 'ARB', instructions: 'Take with or without food.' },
  { name: 'Montelukast', strengths: ['10mg'], category: 'Antiasthmatic', instructions: 'Take in the evening.' }
];

const SPECIALTIES = ['Cardiology', 'General Medicine', 'Dermatology', 'Orthopaedics', 'Psychiatry'];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateIndianName(): string {
  const isMale = Math.random() > 0.5;
  const first = getRandomElement(isMale ? MALE_NAMES : FEMALE_NAMES);
  const last = getRandomElement(LAST_NAMES);
  return `${first} ${last}`;
}

async function runSeed() {
  console.log('--- Wiping Existing DB Data ---');
  
  // Wipe tables sequentially to respect foreign key constraints
  const tables = [
    'notifications', 'ab_test_results', 'prompt_versions', 'eval_results',
    'mcp_tool_calls', 'agent_runs', 'intervention_log', 'escalations',
    'outreach_log', 'recovery_sessions', 'cancellation_events', 'risk_scores',
    'triage_sessions', 'scribe_sessions', 'clinical_notes', 'lab_orders',
    'prescriptions', 'allergies', 'medical_history', 'waitlist', 'appointments',
    'slots', 'patients', 'doctors', 'clinics', 'users'
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq('id', 'placeholder_to_delete_all');
    if (error) {
      console.warn(`Warning wiping table ${table}:`, error.message);
    }
  }

  console.log('✅ Wiped successfully');
  console.log('--- Seeding Clinics ---');

  const clinics = [
    { name: 'City Clinic Delhi', address: '12, Barakhamba Road, Connaught Place', city: 'Delhi', phone: '+911144321234' },
    { name: 'Metro Healthcare Mumbai', address: '45, Linking Road, Bandra West', city: 'Mumbai', phone: '+912266543210' }
  ];

  const { data: clinicsData, error: clinicsErr } = await supabase.from('clinics').insert(clinics).select();
  if (clinicsErr || !clinicsData) {
    console.error('Error seeding clinics:', clinicsErr);
    return;
  }
  console.log(`✅ Seeded ${clinicsData.length} clinics`);

  console.log('--- Seeding Users for Doctors ---');
  const doctorSpecialties = [
    { name: 'Dr. Rajesh Sharma', specialty: 'Cardiology', fee: 1500, clinic: clinicsData[0].id },
    { name: 'Dr. Sunita Rao', specialty: 'Cardiology', fee: 1500, clinic: clinicsData[0].id },
    { name: 'Dr. Amit Shah', specialty: 'Cardiology', fee: 1800, clinic: clinicsData[1].id },
    { name: 'Dr. Priya Gupta', specialty: 'Dermatology', fee: 1200, clinic: clinicsData[0].id },
    { name: 'Dr. Meera Nair', specialty: 'Dermatology', fee: 1200, clinic: clinicsData[1].id },
    { name: 'Dr. Rohan Verma', specialty: 'Orthopaedics', fee: 1300, clinic: clinicsData[0].id },
    { name: 'Dr. Sandeep Singh', specialty: 'Orthopaedics', fee: 1300, clinic: clinicsData[1].id },
    { name: 'Dr. Vikram Patel', specialty: 'General Medicine', fee: 1000, clinic: clinicsData[0].id },
    { name: 'Dr. Kavita Reddy', specialty: 'General Medicine', fee: 1000, clinic: clinicsData[1].id },
    { name: 'Dr. Ananya Iyer', specialty: 'Psychiatry', fee: 1800, clinic: clinicsData[0].id }
  ];

  const doctorsList = [];

  for (const doc of doctorSpecialties) {
    const docEmail = doc.name.toLowerCase().replace(/[.\s]+/g, '') + '@cureva.in';
    const { data: userData, error: userErr } = await supabase.from('users').insert({
      email: docEmail,
      hashed_password: 'pbkdf2:sha256:600000$doctorpwd$mock', // mock password
      role: 'doctor'
    }).select().single();

    if (userErr || !userData) {
      console.error(`Error seeding user for ${doc.name}:`, userErr);
      continue;
    }

    const { data: docData, error: docErr } = await supabase.from('doctors').insert({
      user_id: userData.id,
      clinic_id: doc.clinic,
      name: doc.name,
      specialty: doc.specialty,
      consultation_fee_inr: doc.fee,
      qualification: doc.specialty === 'Cardiology' ? 'MD, DM (Cardiology)' : 'MBBS, MD',
      registration_no: `MCI/DL/${getRandomInt(10000, 99999)}`,
      phone: `+919876${getRandomInt(100000, 999999)}`,
      rating: 4.5 + Math.random() * 0.4,
      review_count: getRandomInt(10, 150)
    }).select().single();

    if (docErr || !docData) {
      console.error(`Error seeding doctor ${doc.name}:`, docErr);
      continue;
    }

    doctorsList.push(docData);
  }
  console.log(`✅ Seeded ${doctorsList.length} doctors`);

  console.log('--- Seeding Priya Mehta (Canonical Demo Patient) ---');
  const patientsList: any[] = [];
  const priyaUserEmail = 'priya.mehta@gmail.com';
  const { data: priyaUser, error: priyaUserErr } = await supabase.from('users').insert({
    email: priyaUserEmail,
    hashed_password: 'pbkdf2:sha256:600000$patientpwd$mock',
    role: 'patient'
  }).select().single();

  if (priyaUserErr || !priyaUser) {
    console.error('Error seeding Priya Mehta user:', priyaUserErr);
  } else {
    const { data: priyaPatient, error: priyaErr } = await supabase.from('patients').insert({
      id: 'P-1042',
      user_id: priyaUser.id,
      name: 'Priya Mehta',
      phone: '+91 98765 43210',
      dob: '1991-06-17',
      gender: 'female',
      blood_group: 'B+',
      address: '42, Green Park Extension',
      city: 'Delhi',
      distance_km: 2.1,
      preferences: {
        preferred_language: 'english',
        preferred_channel: 'whatsapp'
      },
      is_active: true
    }).select().single();

    if (priyaErr || !priyaPatient) {
      console.error('Error seeding Priya Mehta patient:', priyaErr);
    } else {
      console.log('✅ Seeded Priya Mehta (P-1042) as first patient');
      patientsList.push(priyaPatient);
    }
  }

  console.log('--- Seeding Additional Patients ---');
  const patientCount = 200;

  for (let i = 1; i <= patientCount; i++) {
    const pName = generateIndianName();
    const pEmail = pName.toLowerCase().replace(/[.\s]+/g, '') + `${i}@gmail.com`;
    
    const { data: userData, error: userErr } = await supabase.from('users').insert({
      email: pEmail,
      hashed_password: 'pbkdf2:sha256:600000$patientpwd$mock',
      role: 'patient'
    }).select().single();

    if (userErr || !userData) {
      continue;
    }

    const city = Math.random() > 0.6 ? 'Mumbai' : 'Delhi';
    const gender = Math.random() > 0.5 ? 'male' : 'female';
    const age = getRandomInt(18, 75);
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - age);

    const { data: patientData, error: patientErr } = await supabase.from('patients').insert({
      user_id: userData.id,
      name: pName,
      phone: `+919988${getRandomInt(100000, 999999)}`,
      dob: dob.toISOString().split('T')[0],
      gender,
      blood_group: getRandomElement(['O+', 'A+', 'B+', 'AB+', 'O-', 'A-']),
      address: `${getRandomInt(1, 100)}, Pocket ${getRandomElement(['A', 'B', 'C', 'D'])}, Sector ${getRandomInt(1, 24)}`,
      city,
      distance_km: parseFloat((Math.random() * 20).toFixed(2)),
      preferences: {
        preferred_doctor_id: getRandomElement(doctorsList).id,
        preferred_language: Math.random() > 0.4 ? 'english' : 'hindi',
        preferred_window: getRandomElement(['morning', 'afternoon', 'evening']),
        preferred_channel: getRandomElement(['whatsapp', 'sms']),
        recurring_schedule_days: null,
        avoid_days: []
      }
    }).select().single();

    if (patientErr || !patientData) {
      console.error('Error seeding patient:', patientErr);
      continue;
    }
    patientsList.push(patientData);
  }
  console.log(`✅ Seeded ${patientsList.length} patients`);

  console.log('--- Seeding Slots and Appointments ---');
  // Generate slots for each doctor: 14 days forward, 10 slots per day
  const slotsList = [];
  const appointmentsList = [];
  const startDay = new Date();
  startDay.setHours(9, 0, 0, 0);

  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const date = new Date(startDay);
    date.setDate(date.getDate() + dayOffset);

    // Skip Sundays
    if (date.getDay() === 0) continue;

    for (const doc of doctorsList) {
      for (let slotHour = 9; slotHour < 15; slotHour++) {
        // Skip lunch hour (13:00 - 14:00)
        if (slotHour === 13) continue;

        const slotTime = new Date(date);
        slotTime.setHours(slotHour, 0, 0, 0);
        const endTime = new Date(slotTime);
        endTime.setMinutes(30);

        const { data: slotData, error: slotErr } = await supabase.from('slots').insert({
          doctor_id: doc.id,
          start_time: slotTime.toISOString(),
          end_time: endTime.toISOString(),
          status: 'available'
        }).select().single();

        if (slotErr || !slotData) {
          continue;
        }

        slotsList.push(slotData);

        // Randomly book slots for appointments (~35% fill rate)
        // Skip Priya Mehta (P-1042) — her appointments are seeded explicitly above.
        if (Math.random() < 0.35 && appointmentsList.length < 500) {
          const eligiblePatients = patientsList.filter((p: any) => p.id !== 'P-1042');
          const patient = getRandomElement(eligiblePatients);
          const isPast = slotTime < new Date();
          const status = isPast 
            ? getRandomElement(['completed', 'cancelled', 'no_show'])
            : getRandomElement(['scheduled', 'confirmed']);

          const { data: apptData, error: apptErr } = await supabase.from('appointments').insert({
            patient_id: patient.id,
            doctor_id: doc.id,
            slot_id: slotData.id,
            slot_time: slotTime.toISOString(),
            status,
            specialty: doc.specialty,
            value_inr: doc.consultation_fee_inr,
            reason: getRandomElement(['Routine follow-up', 'Consultation for symptoms', 'Regular checkup', 'Lab report review']),
            is_new_patient: Math.random() > 0.75,
            is_follow_up: Math.random() > 0.6,
            lead_time_days: getRandomInt(1, 15),
            cancellation_reason: status === 'cancelled' ? getRandomElement(['Personal emergency', 'Change of plans', 'Not feeling well']) : ''
          }).select().single();

          if (!apptErr && apptData) {
            appointmentsList.push(apptData);

            // Update slot status
            await supabase.from('slots').update({
              status: status === 'cancelled' ? 'cancelled' : 'booked',
              appointment_id: apptData.id
            }).eq('id', slotData.id);
          }
        }
      }
    }
  }

  console.log(`✅ Seeded ${slotsList.length} slots and ${appointmentsList.length} appointments`);

  console.log('--- Seeding Priya\'s specific appointments ---');
  // Add 2 upcoming appointments for Priya Mehta — one Cardiology (tomorrow), one Dermatology (next week)
  const priyaPatientId = 'P-1042';
  const priyaUserId = patientsList.find(p => p.id === priyaPatientId)?.user_id;
  if (priyaUserId) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 30, 0, 0);

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(15, 0, 0, 0);

    // Find a Cardiology slot for tomorrow
    const { data: cardSlot } = await supabase.from('slots')
      .select('*, doctors(name, specialty, consultation_fee_inr)')
      .eq('status', 'available')
      .eq('doctors.specialty', 'Cardiology')
      .limit(1)
      .single();

    // Find a Dermatology slot for next week
    const { data: dermSlot } = await supabase.from('slots')
      .select('*, doctors(name, specialty, consultation_fee_inr)')
      .eq('status', 'available')
      .eq('doctors.specialty', 'Dermatology')
      .limit(1)
      .single();

    if (cardSlot) {
      await supabase.from('appointments').insert({
        id: `A-${Math.floor(1000 + Math.random() * 9000)}`,
        patient_id: priyaPatientId,
        doctor_id: cardSlot.doctor_id,
        slot_id: cardSlot.id,
        slot_time: tomorrow.toISOString(),
        status: 'scheduled',
        specialty: 'Cardiology',
        value_inr: cardSlot.doctors?.consultation_fee_inr ?? 1500,
        reason: 'Follow-up — Hypertension & lipid panel review',
        is_new_patient: false,
        is_follow_up: true,
        lead_time_days: 1
      });
      await supabase.from('slots').update({ status: 'booked', appointment_id: `A-${Math.floor(1000 + Math.random() * 9000)}` }).eq('id', cardSlot.id);
      console.log('✅ Booked Priya: Cardiology tomorrow 10:30 AM');
    }

    if (dermSlot) {
      await supabase.from('appointments').insert({
        id: `A-${Math.floor(1000 + Math.random() * 9000)}`,
        patient_id: priyaPatientId,
        doctor_id: dermSlot.doctor_id,
        slot_id: dermSlot.id,
        slot_time: nextWeek.toISOString(),
        status: 'scheduled',
        specialty: 'Dermatology',
        value_inr: dermSlot.doctors?.consultation_fee_inr ?? 1200,
        reason: 'Annual skin check + mole screening',
        is_new_patient: false,
        is_follow_up: false,
        lead_time_days: 7
      });
      await supabase.from('slots').update({ status: 'booked', appointment_id: `A-${Math.floor(1000 + Math.random() * 9000)}` }).eq('id', dermSlot.id);
      console.log('✅ Booked Priya: Dermatology next week 3:00 PM');
    }
  }

  console.log('--- Seeding Waitlist ---');
  const waitlistCount = 180;
  let seededWaitlist = 0;
  for (let w = 0; w < waitlistCount; w++) {
    const patient = getRandomElement(patientsList);
    const doctor = getRandomElement(doctorsList);
    const urgency = getRandomElement(['low', 'medium', 'high']);
    
    const { error: wlErr } = await supabase.from('waitlist').insert({
      patient_id: patient.id,
      specialty: doctor.specialty,
      doctor_id: doctor.id,
      priority_score: parseFloat(Math.random().toFixed(3)),
      wait_days: getRandomInt(1, 28),
      urgency,
      is_active: Math.random() > 0.2
    });

    if (!wlErr) {
      seededWaitlist++;
    }
  }
  console.log(`✅ Seeded ${seededWaitlist} waitlist entries`);

  console.log('--- Seeding Clinical Records (Prescriptions, Vitals, Notes) ---');
  // For each completed appointment, seed clinical records
  const completedAppts = appointmentsList.filter(a => a.status === 'completed');
  let clinicalCount = 0;

  for (const appt of completedAppts) {
    // 1. Medical History
    const condition = getRandomElement(CLINICAL_CONDITIONS);
    await supabase.from('medical_history').insert({
      patient_id: appt.patient_id,
      condition,
      diagnosed_at: new Date(Date.now() - getRandomInt(30, 365) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'active',
      notes: 'Monitored regular outpatient check'
    });

    // 2. Allergies
    if (Math.random() > 0.8) {
      await supabase.from('allergies').insert({
        patient_id: appt.patient_id,
        allergen: getRandomElement(['Penicillin', 'Sulfa Drugs', 'Dust Mites', 'Peanuts']),
        severity: getRandomElement(['mild', 'moderate', 'severe']),
        reaction: 'Skin rash, mild breathing trouble'
      });
    }

    // 3. Prescription
    const drugA = getRandomElement(DRUGS);
    const drugB = getRandomElement(DRUGS.filter(d => d.name !== drugA.name));
    
    const medicines = [
      { name: drugA.name, strength: getRandomElement(drugA.strengths), dosage: '1-0-1', duration_days: 30, instructions: drugA.instructions, category: drugA.category },
      { name: drugB.name, strength: getRandomElement(drugB.strengths), dosage: '1-0-0', duration_days: 15, instructions: drugB.instructions, category: drugB.category }
    ];

    await supabase.from('prescriptions').insert({
      appointment_id: appt.id,
      patient_id: appt.patient_id,
      doctor_id: appt.doctor_id,
      diagnosis: condition + ', General weakness',
      medicines,
      tests_ordered: [getRandomElement(['Lipid Profile', 'HbA1c', 'Complete Blood Count'])],
      instructions: 'Maintain low-sodium diet, drink plenty of water, walk 30 minutes daily.',
      follow_up_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      pdf_url: `https://mock.storage.cureva.in/prescriptions/${appt.id}.pdf`,
      sent_at: appt.slot_time,
      sent_channel: 'whatsapp'
    });

    // 4. Lab Orders
    await supabase.from('lab_orders').insert({
      appointment_id: appt.id,
      patient_id: appt.patient_id,
      doctor_id: appt.doctor_id,
      tests: [{ name: 'Lipid Profile', fasting_required: true }],
      status: 'ready',
      results: [
        { param: 'Total Cholesterol', value: getRandomInt(150, 260), unit: 'mg/dL', reference_range: '< 200', status: 'normal' },
        { param: 'LDL Cholesterol', value: getRandomInt(80, 160), unit: 'mg/dL', reference_range: '< 130', status: 'high' }
      ],
      results_url: 'https://mock.storage.cureva.in/labs/lipid_profile.pdf'
    });

    // 5. Clinical Note
    const sysBP = getRandomInt(110, 145);
    const diaBP = getRandomInt(70, 95);
    await supabase.from('clinical_notes').insert({
      appointment_id: appt.id,
      doctor_id: appt.doctor_id,
      scribe_transcript: `Dr: How are you feeling today?\nPatient: Better doctor, but my blood pressure has been fluctuating a bit. Still having occasional headaches.\nDr: Let me examine you. Your BP is ${sysBP}/${diaBP}. The rest of the vitals look normal. We will continue your current statin medication.`,
      subjective: `Patient reports feeling generally well. Complains of occasional morning headaches. Follow-up for ${condition}.`,
      objective: {
        bp: `${sysBP}/${diaBP}`,
        weight: getRandomInt(55, 85),
        heart_rate: getRandomInt(65, 95),
        temperature: 98.6,
        spo2: 98,
        other: ''
      },
      assessment: condition + ' - BP control evaluation',
      plan: `Continue current Atorvastatin therapy.\nRequest fasting lipid profile and HbA1c lab tests.\nFollow-up in 30 days.`,
      ai_alerts: sysBP > 140 ? [{ message: 'Elevated systolic BP detected', severity: 'warning', source: 'vitals' }] : []
    });

    clinicalCount++;
  }
  console.log(`✅ Seeded clinical notes and records for ${clinicalCount} appointments`);

  console.log('--- Seeding Priya\'s 5 distinct lab reports ---');
  if (priyaUserId) {
    const labReports = [
      {
        test_name: 'Complete Blood Count (CBC)',
        ordered_by_specialty: 'Cardiology',
        fasting_required: false,
        results: [
          { param: 'Hemoglobin', value: 13.2, unit: 'g/dL', reference_range: '12.0–16.0', status: 'normal' },
          { param: 'WBC Count', value: 7200, unit: '/μL', reference_range: '4000–11000', status: 'normal' },
          { param: 'Platelet Count', value: 245000, unit: '/μL', reference_range: '150000–450000', status: 'normal' },
          { param: 'RBC Count', value: 4.5, unit: 'million/μL', reference_range: '3.8–5.2', status: 'normal' }
        ],
        interpretation: 'All blood cell counts within normal range. No signs of anemia, infection, or clotting disorders.'
      },
      {
        test_name: 'Lipid Panel',
        ordered_by_specialty: 'Cardiology',
        fasting_required: true,
        results: [
          { param: 'Total Cholesterol', value: 210, unit: 'mg/dL', reference_range: '<200', status: 'high' },
          { param: 'LDL Cholesterol', value: 142, unit: 'mg/dL', reference_range: '<130', status: 'high' },
          { param: 'HDL Cholesterol', value: 48, unit: 'mg/dL', reference_range: '>40', status: 'normal' },
          { param: 'Triglycerides', value: 155, unit: 'mg/dL', reference_range: '<150', status: 'high' }
        ],
        interpretation: 'Elevated LDL and total cholesterol. Patient is on Atorvastatin 10mg. Recommend dietary review and recheck in 3 months.'
      },
      {
        test_name: 'HbA1c (Glycated Hemoglobin)',
        ordered_by_specialty: 'Cardiology',
        fasting_required: false,
        results: [
          { param: 'HbA1c', value: 5.9, unit: '%', reference_range: '<5.7', status: 'warning' },
          { param: 'Estimated Average Glucose', value: 123, unit: 'mg/dL', reference_range: '<117', status: 'warning' }
        ],
        interpretation: 'Prediabetic range (5.7–6.4%). Trending up over 3 visits. Recommend lifestyle modification and recheck in 6 months.'
      },
      {
        test_name: 'Liver Function Test (LFT)',
        ordered_by_specialty: 'General Medicine',
        fasting_required: true,
        results: [
          { param: 'SGOT (AST)', value: 26, unit: 'U/L', reference_range: '5–40', status: 'normal' },
          { param: 'SGPT (ALT)', value: 29, unit: 'U/L', reference_range: '7–56', status: 'normal' },
          { param: 'Total Bilirubin', value: 0.8, unit: 'mg/dL', reference_range: '0.1–1.2', status: 'normal' },
          { param: 'Alkaline Phosphatase', value: 78, unit: 'U/L', reference_range: '44–147', status: 'normal' }
        ],
        interpretation: 'Liver enzymes normal. Atorvastatin not causing hepatotoxicity. Safe to continue current statin dose.'
      },
      {
        test_name: 'Thyroid Function Test (TFT)',
        ordered_by_specialty: 'General Medicine',
        fasting_required: false,
        results: [
          { param: 'TSH', value: 2.8, unit: 'mIU/L', reference_range: '0.4–4.0', status: 'normal' },
          { param: 'Free T4', value: 1.1, unit: 'ng/dL', reference_range: '0.8–1.8', status: 'normal' },
          { param: 'Free T3', value: 3.2, unit: 'pg/mL', reference_range: '2.3–4.2', status: 'normal' }
        ],
        interpretation: 'Thyroid function within normal limits. No signs of hypo- or hyperthyroidism.'
      }
    ];

    // Find a Priya appointment to associate the lab orders with
    const { data: priyaAppts } = await supabase.from('appointments')
      .select('id')
      .eq('patient_id', priyaPatientId)
      .limit(1);
    const priyaApptId = priyaAppts?.[0]?.id ?? null;

    for (const lab of labReports) {
      // Find a doctor with the matching specialty
      const { data: doctor } = await supabase.from('doctors')
        .select('id')
        .eq('specialty', lab.ordered_by_specialty)
        .limit(1)
        .single();

      const { data: labOrder, error: labErr } = await supabase.from('lab_orders').insert({
        patient_id: priyaPatientId,
        doctor_id: doctor?.id ?? null,
        appointment_id: priyaApptId,
        tests: [{ name: lab.test_name, fasting_required: lab.fasting_required }],
        results: lab.results,
        results_url: `https://mock.storage.cureva.in/labs/${lab.test_name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.pdf`,
        status: 'ready',
        ordered_at: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString()
      }).select().single();

      if (labErr) {
        console.error(`Failed to insert ${lab.test_name}:`, labErr.message);
      } else {
        console.log(`✅ Lab report: ${lab.test_name} for Priya`);
      }
    }

    // Ingest Priya's lab reports into RAG documents
    console.log('--- Ingesting Priya\'s lab reports into RAG ---');
    let ragSuccess = false;
    try {
      const { embedBatch } = await import('../app/ai/embeddings');
      const { supabaseAdmin } = await import('../app/db/supabase');

      const ragDocs = labReports.map((lab) => ({
        text: `Patient: Priya Mehta (P-1042, 34F, B+)\nTest: ${lab.test_name}\nSpecialty: ${lab.ordered_by_specialty}\nResults: ${lab.results.map(r => `${r.param} ${r.value} ${r.unit} (ref ${r.reference_range}, ${r.status})`).join('; ')}\nInterpretation: ${lab.interpretation}\nDate: ${new Date().toISOString().slice(0, 10)}`,
        source: `lab_report:${lab.test_name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
        category: 'lab_report',
        patient_id: priyaPatientId,
        patient_name: 'Priya Mehta',
        test_type: lab.test_name
      }));

      const vectors = await embedBatch(ragDocs.map(d => d.text));
      const ragRows = ragDocs.map((doc, i) => ({
        text: doc.text,
        source: doc.source,
        category: doc.category,
        embedding: vectors[i]
      }));

      const { error: ragErr } = await supabaseAdmin.from('documents').insert(ragRows);
      if (ragErr) {
        console.error('RAG ingest error:', ragErr.message);
      } else {
        console.log(`✅ Ingested ${ragRows.length} Priya lab reports into RAG documents`);
        ragSuccess = true;
      }
    } catch (ragErr) {
      console.warn('RAG ingest failed (likely OpenRouter quota):', ragErr.message);
    }
  }

  console.log('--- Seeding Priya\'s 5 prescriptions ---');
  if (priyaUserId) {
    const prescriptions = [
      {
        diagnosis: 'Hypertension Stage 1',
        medicines: [
          { name: 'Telmisartan', strength: '40mg', dosage: '1-0-0', duration_days: 30, instructions: 'Take in morning. Monitor BP weekly.' },
          { name: 'Amlodipine', strength: '5mg', dosage: '0-0-1', duration_days: 30, instructions: 'Take at bedtime. May cause mild ankle swelling.' }
        ],
        notes: 'Continue lifestyle modifications. Recheck BP in 4 weeks.',
        follow_up_days: 30,
        specialty: 'Cardiology'
      },
      {
        diagnosis: 'Hyperlipidemia (High LDL)',
        medicines: [
          { name: 'Atorvastatin', strength: '10mg', dosage: '0-0-1', duration_days: 90, instructions: 'Take after dinner. Avoid grapefruit juice.' }
        ],
        notes: 'Lipid panel in 3 months. Target LDL < 100 mg/dL.',
        follow_up_days: 90,
        specialty: 'Cardiology'
      },
      {
        diagnosis: 'Prediabetes (HbA1c 5.9%)',
        medicines: [
          { name: 'Metformin', strength: '500mg', dosage: '1-0-1', duration_days: 30, instructions: 'Take with meals to reduce GI side effects. Lifestyle modification primary.' }
        ],
        notes: 'Lifestyle changes primary. Recheck HbA1c in 3 months.',
        follow_up_days: 90,
        specialty: 'General Medicine'
      },
      {
        diagnosis: 'Vitamin D Deficiency',
        medicines: [
          { name: 'Cholecalciferol (D3)', strength: '60000 IU', dosage: '1 sachet weekly', duration_days: 56, instructions: 'Mix in milk. Take with fatty meal for absorption.' }
        ],
        notes: '8-week course. Recheck 25-OH Vitamin D after completion.',
        follow_up_days: 60,
        specialty: 'General Medicine'
      },
      {
        diagnosis: 'Iron Deficiency (mild)',
        medicines: [
          { name: 'Ferrous Sulfate', strength: '200mg', dosage: '1-0-0', duration_days: 30, instructions: 'Take on empty stomach with vitamin C. Avoid tea/coffee within 1 hour.' }
        ],
        notes: 'Mild deficiency, oral supplementation sufficient.',
        follow_up_days: 30,
        specialty: 'General Medicine'
      }
    ];

    for (const rx of prescriptions) {
      const { data: doctor } = await supabase.from('doctors').select('id').eq('specialty', rx.specialty).limit(1).single();
      const { data: appt } = await supabase.from('appointments')
        .select('id').eq('patient_id', priyaPatientId).eq('status', 'scheduled').limit(1).single();

      const { error: rxErr } = await supabase.from('prescriptions').insert({
        patient_id: priyaPatientId,
        doctor_id: doctor?.id ?? null,
        appointment_id: appt?.id ?? null,
        diagnosis: rx.diagnosis,
        medicines: rx.medicines,
        instructions: rx.notes,
        follow_up_date: new Date(Date.now() + rx.follow_up_days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        created_at: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString()
      });

      if (rxErr) {
        console.error(`Failed to insert Rx ${rx.diagnosis}:`, rxErr.message);
      } else {
        console.log(`✅ Prescription: ${rx.diagnosis}`);
      }
    }
  }

  console.log('--- Seeding SlotSaver Data ---');
  // Seed risk scores for all upcoming appointments
  const upcomingAppts = appointmentsList.filter(a => a.status === 'scheduled' || a.status === 'confirmed');
  let riskScoresCount = 0;

  for (const appt of upcomingAppts) {
    const score = parseFloat((Math.random() * 0.95).toFixed(3));
    let tier = 'low';
    if (score > 0.85) tier = 'critical';
    else if (score > 0.65) tier = 'high';
    else if (score > 0.40) tier = 'medium';

    const channel = tier === 'critical' || tier === 'high' ? 'voice_call' : (tier === 'medium' ? 'whatsapp' : 'sms');
    const interventionTime = new Date(appt.slot_time);
    interventionTime.setHours(interventionTime.getHours() - 4); // 4h before slot

    const { error: rsErr } = await supabase.from('risk_scores').insert({
      appointment_id: appt.id,
      patient_id: appt.patient_id,
      score,
      tier,
      features: {
        is_new_patient: appt.is_new_patient,
        lead_time_days: appt.lead_time_days,
        distance_km: parseFloat((Math.random() * 18).toFixed(1)),
        past_no_show_rate: parseFloat((Math.random() * 0.3).toFixed(2)),
        no_show_streak: getRandomInt(0, 2),
        last_reminder_response: getRandomInt(0, 1),
        appointment_value_inr: appt.value_inr,
        is_follow_up: appt.is_follow_up
      },
      top_factors: [
        `Past no-show rate is ${(Math.random()*20).toFixed(0)}%`,
        `Lead booking duration: ${appt.lead_time_days} days`
      ],
      planned_intervention: channel,
      intervention_time: interventionTime.toISOString()
    });

    if (!rsErr) riskScoresCount++;
  }

  console.log(`✅ Seeded ${riskScoresCount} risk scores for upcoming appointments`);

  // Seed cancellation and recovery history (last 30 days)
  console.log('--- Seeding SlotSaver Cancellation & Recovery Sessions ---');
  const cancelledAppts = appointmentsList.filter(a => a.status === 'cancelled');
  let recoveryCount = 0;

  for (const appt of cancelledAppts.slice(0, 50)) {
    // 1. Cancellation Event
    const { data: cancelData, error: cancelErr } = await supabase.from('cancellation_events').insert({
      appointment_id: appt.id,
      slot_id: appt.slot_id,
      cancelled_at: new Date(appt.slot_time).toISOString(),
      cancelled_by: Math.random() > 0.5 ? 'patient' : 'frontdesk',
      reason: appt.cancellation_reason
    }).select().single();

    if (cancelErr || !cancelData) continue;

    // 2. Recovery Session
    const recovered = Math.random() > 0.3; // 70% recovery success rate
    const fillTime = recovered ? getRandomInt(120, 900) : null;
    const closedAt = new Date(cancelData.cancelled_at);
    if (fillTime) closedAt.setSeconds(closedAt.getSeconds() + fillTime);

    const targetPatient = getRandomElement(patientsList);

    const { data: recSession, error: recErr } = await supabase.from('recovery_sessions').insert({
      slot_id: appt.slot_id,
      cancellation_event_id: cancelData.id,
      started_at: cancelData.cancelled_at,
      closed_at: recovered ? closedAt.toISOString() : null,
      outcome: recovered ? 'recovered' : 'lost',
      fill_time_seconds: fillTime,
      revenue_inr: recovered ? appt.value_inr : 0,
      patients_contacted: getRandomInt(1, 4),
      filled_by_patient: recovered ? targetPatient.id : null
    }).select().single();

    if (recErr || !recSession) continue;

    // 3. Link cancellation event to recovery session
    await supabase.from('cancellation_events').update({
      recovery_session_id: recSession.id
    }).eq('id', cancelData.id);

    // 4. Seeding outreach log for this session
    const contactedCount = recSession.patients_contacted;
    for (let o = 0; o < contactedCount; o++) {
      const p = patientsList[o % patientsList.length];
      const isWinner = recovered && p.id === targetPatient.id;
      const response = isWinner ? 'yes' : (Math.random() > 0.5 ? 'no' : 'no_response');
      const respondedAt = new Date(recSession.started_at);
      respondedAt.setMinutes(respondedAt.getMinutes() + getRandomInt(1, 10));

      await supabase.from('outreach_log').insert({
        session_id: recSession.id,
        patient_id: p.id,
        rank: o + 1,
        score: parseFloat((0.9 - o * 0.1).toFixed(2)),
        message: `Hi ${p.name.split(' ')[0]}, an appointment slot with Dr. Sharma has opened today at ${new Date(appt.slot_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}. Reply YES to confirm.`,
        channel: 'whatsapp',
        sent_at: recSession.started_at,
        response: response === 'no_response' ? null : response,
        responded_at: response === 'no_response' ? null : respondedAt.toISOString(),
        outcome: response === 'yes' ? 'confirmed' : (response === 'no' ? 'declined' : 'no_response')
      });
    }

    // 5. Seeding Escalations (e.g. if the recovery failed/lost or manually escalated)
    if (!recovered || Math.random() > 0.8) {
      await supabase.from('escalations').insert({
        session_id: recSession.id,
        reason: recovered ? 'manual' : 'no_response_timeout',
        payload: { slot_id: appt.slot_id, doctor_id: appt.doctor_id },
        notified_at: recSession.started_at,
        resolved_at: recovered ? closedAt.toISOString() : null,
        resolved_by: recovered ? 'Receptionist Anil' : '',
        status: recovered ? 'resolved' : 'open',
        revenue_recovered_inr: recovered ? appt.value_inr : 0
      });
    }

    recoveryCount++;
  }
  console.log(`✅ Seeded ${recoveryCount} cancellation and recovery sessions`);

  console.log('--- Seed Script Executed Successfully ---');
}

runSeed().catch(console.error);
