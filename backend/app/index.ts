/**
 * @cureva/backend — shared infrastructure package
 * Exports Supabase clients, AI helpers, and domain controllers.
 */
export * from './db/supabase';
export * from './ai/vercel-gateway';
export * from './ai/embeddings';
export * from './ai/elevenlabs';
// `./ai/gemini` re-exports the legacy `ai`, `generateStructuredOutput`,
// and `transcribeAndTranslateAudio` symbols. We intentionally do NOT use
// `export *` here because both `./ai/elevenlabs` and `./ai/gemini` export
// `transcribeAndTranslateAudio` (the shim forwards to elevenlabs).
export {
  ai,
  generateStructuredOutput,
  transcribeAndTranslateAudio,
} from './ai/gemini';
export * from './domains/slotsaver/slotsaver.controller';
export * from './domains/clinical/clinical.controller';
export * from './domains/patients/patients.controller';
export * from './domains/appointments/appointments.controller';
export * from './domains/analytics/analytics.controller';
export * from './domains/auth/auth.controller';
export * from './middleware/auth.middleware';
export * from './utils/response';
export * from './utils/resend';
