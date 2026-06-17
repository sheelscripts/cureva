export const predictorExplainerPromptTemplate = (
  score: number,
  isNewPatient: boolean,
  distanceKm: number,
  leadTimeDays: number,
  pastNoShowRate: number,
  activeConditions: string[]
) => `
Explain why this appointment has a no-show risk score of ${Math.round(score * 100)}% based on these features:
- Is new patient: ${isNewPatient}
- Distance: ${distanceKm} km
- Lead time: ${leadTimeDays} days
- Past no-show rate: ${Math.round(pastNoShowRate * 100)}%

And patient details:
- Active conditions: ${activeConditions.join(', ') || 'None'}

Return a brief, professional bulleted list explaining the top 3 risk factors.
`;
