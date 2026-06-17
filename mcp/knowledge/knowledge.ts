import { retrieve, buildContext } from '@cureva/rag';
import { generateStructuredOutput } from '@backend/app/ai/gemini';
import { callMcpTool } from '../index';

export async function retrieve_drug_info(agentRunId: string, drug_name: string) {
  return callMcpTool(agentRunId, 'retrieve_drug_info', 'knowledge-mcp', async () => {
    const docs = await retrieve(`${drug_name} dosage side effects indications`, 'drug_information', 2);
    return buildContext(docs);
  }, { drug_name });
}

export async function check_drug_interaction(agentRunId: string, drug_a: string, drug_b: string) {
  return callMcpTool(agentRunId, 'check_drug_interaction', 'knowledge-mcp', async () => {
    const docs = await retrieve(`${drug_a} ${drug_b} interaction side effects`, 'drug_information', 2);
    const context = buildContext(docs);

    const schema = {
      type: 'OBJECT',
      properties: {
        interaction_found: { type: 'BOOLEAN' },
        severity: { type: 'STRING', enum: ['none', 'mild', 'moderate', 'severe'] },
        description: { type: 'STRING' },
        recommendation: { type: 'STRING' }
      },
      required: ['interaction_found', 'severity', 'description', 'recommendation']
    };

    const prompt = `Check for drug interactions between ${drug_a} and ${drug_b} using the RAG context:
    
    RAG Context:
    ${context || 'No specific interaction record found.'}`;

    const res = await generateStructuredOutput<any>(prompt, schema, 'You are an EMR drug interaction safety check assistant.');
    return {
      ...res,
      context
    };
  }, { drug_a, drug_b });
}

export async function retrieve_symptom_pathway(agentRunId: string, symptoms: string) {
  return callMcpTool(agentRunId, 'retrieve_symptom_pathway', 'knowledge-mcp', async () => {
    const docs = await retrieve(`symptom pathway triage referral ${symptoms}`, 'clinical_guidelines', 2);
    return buildContext(docs);
  }, { symptoms });
}

export async function retrieve_red_flags(agentRunId: string, symptoms: string) {
  return callMcpTool(agentRunId, 'retrieve_red_flags', 'knowledge-mcp', async () => {
    const docs = await retrieve(`red flags clinical emergency ${symptoms}`, 'clinical_guidelines', 2);
    return buildContext(docs);
  }, { symptoms });
}
