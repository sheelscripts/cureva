export const triagePromptTemplate = (symptoms: string, context: string, redFlags: string) => `
Triage the following patient symptoms. Check guidelines RAG context for cardiac protocols.

Symptoms: "${symptoms}"
RAG Guidelines Context:
${context}

RAG Red Flags Context:
${redFlags}

If ANY cardiac markers (chest pain, shortness of breath) are present: urgency must be high/critical and escalate_immediately must be true.
`;
