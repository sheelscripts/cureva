/**
 * Ingest synthetic clinical guidelines into the pgvector `documents`
 * table so the RAG retriever has something to search against.
 *
 * Run with:
 *   npx tsx backend/scripts/ingest-docs.ts
 *
 * The script embeds each chunk via OpenRouter
 * (`openai/text-embedding-3-small`, 768-dim) and writes the resulting
 * vectors straight into the `documents` table. No Gemini dependency.
 */

import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { embedBatch } from '../app/ai/embeddings';

// Load env from the standard locations (same logic as verify-connection.ts).
const repoRoot = resolve(__dirname, '..', '..');
for (const candidate of [
  join(repoRoot, '.env.local'),
  join(repoRoot, 'apps', 'web', '.env.local'),
  join(repoRoot, '.env'),
  join(repoRoot, 'apps', 'web', '.env'),
]) {
  if (existsSync(candidate)) loadEnv({ path: candidate });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const openrouterKey = process.env.OPENROUTER_API_KEY || '';

if (!supabaseUrl || !supabaseServiceKey || !openrouterKey) {
  console.error(
    'Error: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or OPENROUTER_API_KEY not set.'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const DOCUMENT_CATEGORIES: Record<string, { category: string; mockContent: string }> = {
  'cardiac_triage.pdf': {
    category: 'clinical_guidelines',
    mockContent: `CARDIAC TRIAGE GUIDELINES — City Clinic Protocol
CHEST PAIN ASSESSMENT
All patients presenting with chest pain must be triaged within 5 minutes.
Red Flag Symptoms (Immediate Escalation Required):
- Crushing or squeezing chest pain
- Radiation to left arm, jaw, or back
- Associated shortness of breath
- Diaphoresis (sweating)
- Nausea or vomiting
- Syncope or near-syncope
- Oxygen saturation < 92%
Initial Assessment Protocol:
1. 12-lead ECG within 10 minutes of arrival
2. Serial troponins at 0h and 3h
3. Chest X-ray
4. IV access and cardiac monitoring
Specialist Referral Criteria:
- Suspected ACS: Immediate cardiology referral
- Stable angina: Cardiology within 72 hours
- Non-cardiac chest pain: General medicine
Drug Therapy First Line:
Aspirin 325mg stat (if no contraindication)
Nitroglycerin 0.4mg sublingual for ongoing pain`,
  },
  'drug_interactions.pdf': {
    category: 'drug_information',
    mockContent: `COMMON DRUG INTERACTIONS — Clinical Reference
CARDIOVASCULAR DRUGS
Aspirin + Ibuprofen:
Severity: Moderate
Mechanism: Ibuprofen competitively inhibits COX-1, blocking aspirin's irreversible platelet inhibition. Increases GI bleeding risk.
Management: Avoid combination. Use paracetamol for analgesia if needed.
Warfarin + Aspirin:
Severity: Severe
Mechanism: Additive anticoagulant effect. Significantly increased bleeding risk.
Management: Avoid unless specifically indicated by cardiologist.
Atorvastatin + Clarithromycin:
Severity: Moderate
Mechanism: Clarithromycin inhibits CYP3A4, increasing atorvastatin levels. Risk of myopathy and rhabdomyolysis.
Management: Use azithromycin instead. If must use clarithromycin, temporarily discontinue atorvastatin.
Metformin + Iodinated Contrast:
Severity: Severe
Mechanism: Risk of contrast-induced nephropathy and lactic acidosis.
Management: Hold metformin 48 hours before and after contrast procedures.
Ciprofloxacin + Antacids:
Severity: Moderate
Mechanism: Antacids reduce ciprofloxacin absorption by up to 90%.
Management: Separate administration by at least 2 hours.`,
  },
  'escalation_sop.pdf': {
    category: 'sop',
    mockContent: `ESCALATION STANDARD OPERATING PROCEDURE
When to Escalate to Human Staff:
1. No-Show Recovery Timeout
   Trigger: No patient response within 15 minutes of outreach
   Action: Notify front desk with full handoff payload
   Include: Slot details, patients contacted, recommended next action
2. Critical Triage Symptoms
   Trigger: Red flag symptoms detected in patient intake
   Action: Immediate doctor notification + recommend ER if needed
3. Agent Confidence Below Threshold
   Trigger: Agent confidence score < 0.60
   Action: Pause agent action, notify supervising staff
4. Drug Interaction Alert
   Trigger: Severe interaction detected in prescription
   Action: Block prescription generation, alert doctor
Handoff Format:
All escalations must include: Session ID, Timestamp, What the agent attempted, Why it escalated, Recommended human action, Patient contact information.`,
  },
  'dpdp_compliance.pdf': {
    category: 'compliance',
    mockContent: `DIGITAL PERSONAL DATA PROTECTION (DPDP) COMPLIANCE
Patient Data Protection Principles:
1. Purpose Limitation: Personal health data must only be processed for clinical treatment, billing, and scheduling.
2. Consent Requirement: Consent must be explicit, specific, and revocable.
3. Access Control: Only authorized personnel (assigned Doctor, Nurse, Clinic Admin) can view Patient Health Records.
4. Audit Trail: Every retrieval or modification of patient health files must be logged with timestamp, user ID, and action.
5. Patient Rights: Patients can request correction, erasure, or summary of their records.`,
  },
  'waitlist_policy.pdf': {
    category: 'policy',
    mockContent: `WAITLIST MANAGEMENT POLICY
Priority Scoring Algorithm:
Waitlist priority is ranked using a composite score (0-1):
- Wait Time (30% weight): Min of 30 days wait = score 1.0.
- Urgency (25% weight): High=1.0, Medium=0.6, Low=0.3.
- Proximity (20% weight): 1 - (distance_km / 25).
- Historical Response Rate (15% weight): Rate of accepting prior openings.
- Specialty Match (10% weight): Direct match with cancelled doctor's specialty.
Outreach Guidelines:
Contact top 3 ranked patients simultaneously via preferred channel (WhatsApp or SMS). First to confirm receives the slot.`,
  },
};

function chunkText(text: string, chunkSize = 512, overlap = 50): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    // Attempt to end at a sentence or newline boundary
    let end = i + chunkSize;
    if (end < text.length) {
      const remainingText = text.substring(i, end + 100);
      const boundaryIndex = remainingText.search(/[\n.]/);
      if (boundaryIndex !== -1 && boundaryIndex < 100) {
        end = i + boundaryIndex + 1;
      }
    }
    chunks.push(text.substring(i, end).trim());
    i = end - overlap;
  }
  return chunks.filter((c) => c.length > 50);
}

async function runIngest() {
  console.log('--- Wiping Existing Documents in pgvector ---');
  const { error: deleteErr } = await supabase
    .from('documents')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (deleteErr) {
    console.error('Error wiping documents:', deleteErr);
    return;
  }
  console.log('✅ Documents wiped');

  console.log('--- Starting Document Ingestion ---');

  for (const [filename, docInfo] of Object.entries(DOCUMENT_CATEGORIES)) {
    console.log(`[Processing] ${filename} (${docInfo.category})`);

    const content = docInfo.mockContent;
    const chunks = chunkText(content);
    console.log(`  → Split into ${chunks.length} chunks`);

    // Embed the entire batch in one (or a few) OpenRouter calls.
    let vectors: number[][];
    try {
      vectors = await embedBatch(chunks);
    } catch (e: any) {
      console.error(`  ❌ Embedding API error: ${e?.message || e}`);
      continue;
    }

    // Build insert rows. OpenRouter returns vectors in input order
    // but we trust the API; defensive length check anyway.
    const rows = chunks
      .map((chunk, i) => ({ chunk, vector: vectors[i] }))
      .filter(({ vector }) => Array.isArray(vector) && vector.length === 768)
      .map(({ chunk, vector }) => ({
        text: chunk,
        source: filename,
        category: docInfo.category,
        embedding: vector,
      }));

    if (rows.length === 0) {
      console.error(`  ❌ No usable vectors returned for ${filename}`);
      continue;
    }

    const { error: insertErr } = await supabase.from('documents').insert(rows);
    if (insertErr) {
      console.error(`  ❌ DB Insert error: ${insertErr.message}`);
      continue;
    }
    console.log(`  ✅ Inserted ${rows.length} chunks for ${filename}`);
  }

  console.log('--- Ingestion Finished Successfully ---');
}

runIngest().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
