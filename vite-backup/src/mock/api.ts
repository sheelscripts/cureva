import { 
  currentPatient, 
  appointments, 
  prescriptions, 
  labReports, 
  healthTimeline 
} from "./patients";

const delay = <T>(data: T, ms: number): Promise<T> => {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
};

export const getPatient = () => delay(currentPatient, 600);
export const getAppointments = () => delay(appointments, 700);
export const getPrescriptions = () => delay(prescriptions, 500);
export const getLabReports = () => delay(labReports, 550);
export const getHealthTimeline = () => delay(healthTimeline, 400);

export const bookAppointment = (slotId: string, doctorName: string, date: string, time: string, specialty: string, cost: number) => {
  return delay({ 
    success: true, 
    appointment: {
      id: `A-${Math.floor(1000 + Math.random() * 9000)}`,
      doctorName,
      specialty,
      date,
      time,
      status: "upcoming",
      location: "City Clinic, Sector 12",
      valueInr: cost,
      reason: "Triage assisted symptom-based appointment"
    }
  }, 900);
};

export const generateAIResponse = (message: string): { content: string; actions?: Array<{ label: string; slotId: string; doctorName: string; time: string; specialty: string; cost: number }> } => {
  const query = message.toLowerCase();
  
  if (query.includes("chest") || query.includes("breath") || query.includes("heart") || query.includes("pressure") || query.includes("headache")) {
    return {
      content: "These symptoms need immediate cardiological evaluation. Based on your historical diagnostic stage of Stage 1 Hypertension, resolving this proactively is highly recommended.\n\nDr. Rajesh Sharma has a slot today at 4:30 PM (2.1km away) — ₹1,500\n\nWould you like me to book this cardiology slot for you?",
      actions: [
        { label: "Book 4:30 PM Today", slotId: "S-CARD-430", doctorName: "Dr. Rajesh Sharma", time: "4:30 PM", specialty: "Cardiology", cost: 1500 },
        { label: "Book 11:30 AM Tomorrow", slotId: "S-CARD-1130", doctorName: "Dr. Rajesh Sharma", time: "11:30 AM", specialty: "Cardiology", cost: 1500 }
      ]
    };
  }
  
  if (query.includes("rash") || query.includes("skin") || query.includes("etch") || query.includes("itch")) {
    return {
      content: "A sudden rash points towards a localized eczematous flare or contact dermatitis. We advise avoiding scratch rubbing and discontinue current body wash products until evaluated.\n\nDr. Priya Gupta (Dermatology Unit) has open slots:\n\n- Today at 1:15 PM — ₹1,200\n- Tomorrow at 3:00 PM — ₹1,200\n\nWhich slot works for your schedule?",
      actions: [
        { label: "Book 1:15 PM Today", slotId: "S-DERM-115", doctorName: "Dr. Priya Gupta", time: "1:15 PM", specialty: "Dermatology", cost: 1200 },
        { label: "Book 3:00 PM Tomorrow", slotId: "S-DERM-300", doctorName: "Dr. Priya Gupta", time: "3:00 PM", specialty: "Dermatology", cost: 1200 }
      ]
    };
  }

  if (query.includes("knee") || query.includes("pain") || query.includes("joint") || query.includes("leg")) {
    return {
      content: "This joint discomfort requires an orthopedic checkup. Post-activity stiffness or minor slips can lead to collateral strain if unmanaged.\n\nDr. Rohan Verma (Orthopedics) has a recovered SlotSaver vacancy:\n\n- Today at 11:30 AM — ₹1,300\n\nCan I lock this slot for you?",
      actions: [
        { label: "Book 11:30 AM Today", slotId: "S-ORTHO-1130", doctorName: "Dr. Rohan Verma", time: "11:30 AM", specialty: "Orthopedics", cost: 1300 }
      ]
    };
  }

  if (query.includes("lipid") || query.includes("cholesterol") || query.includes("stat")) {
    return {
      content: "Looking closely at your lipid report history from January 8, your LDL Cholesterol level is elevated at 142 mg/dL. This is outside the optimal range (<130 mg/dL). Your doctor prescribed Atorvastatin 10mg once daily after dinner to manage this.\n\nWe would recommend a routine follow-up with Dr. Rajesh Sharma. Would you like to schedule that now?"
    };
  }

  if (query.includes("atorva") || query.includes("aspir") || query.includes("med") || query.includes("pill") || query.includes("drug")) {
    return {
      content: "According to your active medical files: \n1. **Atorvastatin (10mg)**: 1 pill daily after dinner. Helps control cholesterol synthesis. Avoid grapefruit juice.\n2. **Aspirin (75mg)**: 1 pill daily with food in the morning. Cardio-protective support. Do not crush.\n\nAlways adhere strictly to these clinical durations. Let me know if you experience digestive fatigue, which should be flagged to Dr. Sharma."
    };
  }

  return {
    content: "Understood. I have access to your active health dossier, clinical recordings, and previous medication sheets. Please tell me if you are feeling any temperature shifts, fatigue intervals, pain spikes, or if you simply wish to check open appointment vacancies."
  };
};

export const sendTriageMessage = (msg: string) => delay(generateAIResponse(msg), 800);
