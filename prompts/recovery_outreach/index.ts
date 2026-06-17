export const recoveryOutreachPromptTemplate = (
  patientName: string,
  waitDays: number,
  distance: number,
  specialty: string,
  channel: string,
  doctorName: string
) => `
Generate a personalized, polite waitlist outreach message for a patient.
Patient name: "${patientName}"
Wait time: ${waitDays} days
Distance: ${distance} km
Recommended Specialty: "${specialty}"
Channel: "${channel}"

Rules:
1. Alert them that a slot has just become available today for ${specialty}.
2. Keep it under 2 sentences. Include the doctor name: ${doctorName || 'a doctor'}.
3. If channel is whatsapp, make it conversational. If SMS, keep it concise.
`;
