export const scribePromptTemplate = (currentSoapJson: string, transcript: string) => `
Extract SOAP note updates from this transcript chunk of a doctor-patient conversation:

Current Full SOAP Note:
${currentSoapJson}

Transcript Chunk:
"${transcript}"

Rules:
1. Extract subjective complaints and objective measurements.
2. If medications are mentioned, extract names and instructions.
3. Identify clinical warnings or red-flag alerts.
4. Compare with the current SOAP note, extract ONLY additions/updates in SOAP delta format.
5. Output MUST match the required JSON schema.
`;
