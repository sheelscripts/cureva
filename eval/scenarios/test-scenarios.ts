export interface TriageScenario {
  name: string;
  symptoms: string;
  expectedUrgency: 'low' | 'medium' | 'high' | 'critical';
  expectedSpecialty: string;
}

export interface PrescriptionScenario {
  name: string;
  diagnosis: string;
  medications: string[];
  patientId: string;
  expectedInteractionWarning: boolean;
}

export interface ScribeScenario {
  name: string;
  audioBase64: string;
  expectedKeywords: string[];
}

export const triageScenarios: TriageScenario[] = [
  {
    name: 'Cardiac Emergency (English)',
    symptoms: 'I have severe chest pain that radiates to my left arm and jaw. I feel very short of breath.',
    expectedUrgency: 'critical',
    expectedSpecialty: 'Cardiology'
  },
  {
    name: 'Cardiac Emergency (Hindi)',
    symptoms: 'Mere sine mein bohot tez dard ho raha hai aur left arm mein ja raha hai. Saans lene mein takleef ho rahi hai.',
    expectedUrgency: 'critical',
    expectedSpecialty: 'Cardiology'
  },
  {
    name: 'Skin Rash (English)',
    symptoms: 'I have a red, itchy rash on my inner elbow that flared up this morning. No other symptoms.',
    expectedUrgency: 'low',
    expectedSpecialty: 'Dermatology'
  }
];

export const prescriptionScenarios: PrescriptionScenario[] = [
  {
    name: 'Atorvastatin + Clarithromycin Interaction',
    diagnosis: 'Hyperlipidemia and Bronchitis',
    medications: ['Atorvastatin 10mg', 'Clarithromycin 500mg'],
    patientId: 'P-101', // Example patient id
    expectedInteractionWarning: true
  },
  {
    name: 'Safe Prescription (Atorvastatin Only)',
    diagnosis: 'Hyperlipidemia',
    medications: ['Atorvastatin 10mg'],
    patientId: 'P-101',
    expectedInteractionWarning: false
  }
];

// Mock Base64 WebM audio strings for Scribe tests
// This represents "sir dard ho raha hai do din se aur bukhar bhi hai"
export const scribeScenarios: ScribeScenario[] = [
  {
    name: 'Hinglish Doctor-Patient Conversation',
    // Minimal mock base64 audio header
    audioBase64: 'GkXfo0NChoEBQveBAULygQSTVk0lQ0uNElTrlhFXakRLSWhER0lpTUtHS0lTRVVEbU5HQ0lTRVVEZm5HQ0lTRVVE',
    expectedKeywords: ['headache', 'fever', 'days']
  }
];
