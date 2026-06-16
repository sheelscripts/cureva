/**
 * apps/web/src/lib/agents/orchestrator.ts
 *
 * Thin re-export shim so Next.js API routes continue to work unchanged
 * while the actual implementation lives in the @cureva/agents workspace.
 *
 * All agent logic, SOAP types, and the LangGraph graph are defined in:
 *   agents/orchestrator.ts     — graph topology
 *   agents/nodes.ts            — node implementations
 *   agents/state.ts            — AgentStateAnnotation
 */
export type { AgentState, SOAPNote, SOAPDelta } from '@cureva/agents';
export { runOrchestrator } from '@cureva/agents';
