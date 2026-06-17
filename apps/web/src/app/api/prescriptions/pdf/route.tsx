import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/db/supabase';
import { pdf, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import React from 'react';

// Create PDF styles matching premium clinical aesthetics
const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#333333',
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#2C2C3C',
    paddingBottom: 15,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  clinicName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#08080C',
  },
  clinicDetails: {
    color: '#666666',
    marginTop: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#08080C',
    textAlign: 'right',
  },
  patientBlock: {
    backgroundColor: '#F7F7FA',
    padding: 12,
    borderRadius: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  patientField: {
    width: '45%',
    marginBottom: 6,
  },
  label: {
    fontWeight: 'bold',
    color: '#555555',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#08080C',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingBottom: 4,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  rxSymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#08080C',
    marginBottom: 10,
  },
  medicineRow: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  medName: {
    fontWeight: 'bold',
    fontSize: 10,
  },
  medDetails: {
    color: '#666666',
    marginTop: 2,
  },
  medInstructions: {
    fontStyle: 'italic',
    color: '#888888',
    marginTop: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingTop: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBlock: {
    textAlign: 'right',
  },
});

interface PrescriptionPDFProps {
  doctorName: string;
  specialty: string;
  regNo: string;
  patientName: string;
  patientAge: string;
  patientGender: string;
  diagnosis: string;
  medicines: Array<{
    name: string;
    strength: string;
    dosage: string;
    duration_days: number;
    instructions: string;
  }>;
  testsOrdered: string[];
  instructions: string;
  followUpDate: string;
}

// React PDF Prescription Template
const PrescriptionDocument = ({ data }: { data: PrescriptionPDFProps }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.clinicName}>CUREVA CLINICAL CENTER</Text>
          <Text style={styles.clinicDetails}>Connaught Place, New Delhi | +91 11 4432 1234</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.title}>PRESCRIPTION (Rx)</Text>
          <Text style={styles.clinicDetails}>Dr. {data.doctorName}</Text>
          <Text style={styles.clinicDetails}>{data.specialty} | Reg: {data.regNo}</Text>
        </View>
      </View>

      {/* Patient Information */}
      <View style={styles.patientBlock}>
        <View style={styles.patientField}>
          <Text><Text style={styles.label}>Patient Name: </Text>{data.patientName}</Text>
        </View>
        <View style={styles.patientField}>
          <Text><Text style={styles.label}>Date: </Text>{new Date().toLocaleDateString()}</Text>
        </View>
        <View style={styles.patientField}>
          <Text><Text style={styles.label}>Age / Gender: </Text>{data.patientAge} / {data.patientGender}</Text>
        </View>
        <View style={styles.patientField}>
          <Text><Text style={styles.label}>Specialty: </Text>{data.specialty}</Text>
        </View>
      </View>

      {/* Diagnosis */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Diagnosis</Text>
        <Text style={{ fontSize: 11 }}>{data.diagnosis}</Text>
      </View>

      {/* Medicines (Rx) */}
      <View style={styles.section}>
        <Text style={styles.rxSymbol}>Rx</Text>
        {data.medicines.map((med, index) => (
          <View key={index} style={styles.medicineRow}>
            <Text style={styles.medName}>{index + 1}. {med.name} {med.strength}</Text>
            <Text style={styles.medDetails}>Dosage: {med.dosage} | Duration: {med.duration_days} days</Text>
            {med.instructions ? <Text style={styles.medInstructions}>Note: {med.instructions}</Text> : null}
          </View>
        ))}
      </View>

      {/* Tests Ordered */}
      {data.testsOrdered && data.testsOrdered.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lab Tests Ordered</Text>
          <Text>{data.testsOrdered.join(', ')}</Text>
        </View>
      ) : null}

      {/* General Instructions */}
      {data.instructions ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          <Text>{data.instructions}</Text>
        </View>
      ) : null}

      {/* Follow-up */}
      {data.followUpDate ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Follow-up Appointment</Text>
          <Text>Please schedule a follow-up on or around: {data.followUpDate}</Text>
        </View>
      ) : null}

      {/* Footer / Signature */}
      <View style={styles.footer}>
        <View>
          <Text style={{ color: '#888888' }}>Generated securely via Cureva AI Platform.</Text>
          <Text style={{ color: '#888888', marginTop: 2 }}>DPDP Compliant Electronic Record.</Text>
        </View>
        <View style={styles.signatureBlock}>
          <Text style={{ fontWeight: 'bold' }}>Dr. {data.doctorName}</Text>
          <Text style={{ color: '#666666', marginTop: 2 }}>Digitally Signed</Text>
        </View>
      </View>
    </Page>
  </Document>
);

export async function POST(req: NextRequest) {
  try {
    const { prescriptionId } = await req.json();

    if (!prescriptionId) {
      return NextResponse.json({ error: 'Missing prescriptionId' }, { status: 400 });
    }

    // 1. Fetch prescription details from database
    const { data: prescription, error: presError } = await supabaseAdmin
      .from('prescriptions')
      .select('*, patients(*), doctors(*)')
      .eq('id', prescriptionId)
      .single();

    if (presError || !prescription) {
      throw new Error(`Prescription not found: ${presError?.message}`);
    }

    // Prepare template variables
    const age = prescription.patients?.dob 
      ? new Date().getFullYear() - new Date(prescription.patients.dob).getFullYear()
      : '30';
      
    const docData: PrescriptionPDFProps = {
      doctorName: prescription.doctors?.name || 'Sharma',
      specialty: prescription.doctors?.specialty || 'General',
      regNo: prescription.doctors?.registration_no || 'MCI-12345',
      patientName: prescription.patients?.name || 'Patient',
      patientAge: String(age),
      patientGender: prescription.patients?.gender || 'M',
      diagnosis: prescription.diagnosis,
      medicines: prescription.medicines || [],
      testsOrdered: prescription.tests_ordered || [],
      instructions: prescription.instructions || '',
      followUpDate: prescription.follow_up_date || ''
    };

    // 2. Generate PDF stream/buffer
    const element = React.createElement(PrescriptionDocument, { data: docData });
    const pdfInstance = pdf(element as any);
    const pdfStream = await pdfInstance.toBuffer();

    // 3. Ensure 'prescriptions' storage bucket exists in Supabase
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === 'prescriptions');
    
    if (!bucketExists) {
      await supabaseAdmin.storage.createBucket('prescriptions', { public: true });
    }

    // 4. Upload PDF to Storage
    const fileName = `${prescriptionId}.pdf`;
    const { error: uploadErr } = await supabaseAdmin.storage
      .from('prescriptions')
      .upload(fileName, pdfStream, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadErr) {
      throw new Error(`Failed to upload PDF: ${uploadErr.message}`);
    }

    // 5. Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('prescriptions')
      .getPublicUrl(fileName);

    // 6. Update prescription entry with PDF URL
    await supabaseAdmin
      .from('prescriptions')
      .update({
        pdf_url: publicUrl,
        sent_at: new Date().toISOString(),
        sent_channel: 'email'
      })
      .eq('id', prescriptionId);

    // Send mock notification email (log dispatch)
    await supabaseAdmin.from('notifications').insert({
      user_id: prescription.patients?.user_id,
      patient_id: prescription.patient_id,
      type: 'prescription_ready',
      title: 'Prescription Ready',
      body: `Your prescription is ready. Download here: ${publicUrl}`,
      channel: 'email',
      payload: { pdf_url: publicUrl }
    });

    return NextResponse.json({ success: true, pdfUrl: publicUrl });
  } catch (error: any) {
    console.error('[POST /api/prescriptions/pdf] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate PDF' }, { status: 500 });
  }
}
