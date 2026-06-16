/**
 * apps/web/src/lib/agents/mcpTools.ts
 *
 * DEPRECATED — re-export shim only.
 *
 * The canonical MCP tool implementations live in the @cureva/mcp workspace
 * package. New code should import directly from '@cureva/mcp'. This file
 * exists only so existing `from '@/lib/agents/mcpTools'` imports keep
 * resolving until they can be migrated.
 *
 * Migration plan:
 *   - Replace `from '@/lib/agents/mcpTools'` with `from '@cureva/mcp'`.
 *   - The list of tools exported below matches `mcp/index.ts`; if you add a
 *     tool to @cureva/mcp, add it here too.
 */

export {
  callMcpTool,

  // patient tools
  lookup_patient,
  get_medical_history,
  get_attendance_history,
  get_contact_preferences,
  get_appointment_features,

  // appointment tools
  book_appointment,
  cancel_appointment,

  // waitlist tools
  score_waitlist,

  // knowledge (RAG) tools
  retrieve_drug_info,
  check_drug_interaction,
  retrieve_symptom_pathway,
  retrieve_red_flags,

  // notification tools
  send_whatsapp,
  send_sms,
  notify_frontdesk,
} from '@cureva/mcp';
