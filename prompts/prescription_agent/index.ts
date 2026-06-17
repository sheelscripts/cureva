export const prescriptionRecommenderPromptTemplate = (
  diagnosis: string,
  activeConditions: string[],
  allergies: string[],
  guidelines: string
) => `
Suggest clinical prescriptions for this patient.
Diagnosis: "${diagnosis}"
Patient Medical History:
- Active conditions: ${activeConditions.join(', ') || 'None'}
- Allergies: ${allergies.join(', ') || 'None'}

RAG Guidelines Context:
${guidelines}

Rules:
1. Provide a list of recommended medicines (name, dosage, frequency, duration_days).
2. Provide follow-up days recommendations.
3. Order lab tests if indicated.
4. Avoid prescribing anything matching the patient's allergies: ${allergies.join(', ')}.
`;
