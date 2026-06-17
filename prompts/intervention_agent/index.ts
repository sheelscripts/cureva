export const interventionReminderPromptTemplate = (
  patientName: string,
  slotTime: string,
  doctorName: string,
  specialty: string,
  riskFactors: string[]
) => `
Generate a personalized, patient-centric appointment reminder.
Patient name: "${patientName || 'Patient'}"
Appointment: tomorrow at ${slotTime || 'scheduled time'} with Dr. ${doctorName || 'Doctor'} (${specialty})
High risk factors identified: ${riskFactors.join(', ') || 'None'}

Rules:
1. Gentle reminder, encourage confirmation.
2. Highlight patient-centric importance of the appointment.
3. Keep it brief, professional, and conversational.
`;
