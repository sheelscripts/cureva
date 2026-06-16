/**
 * Auth domain controller.
 * Handles Supabase Auth session management on server side.
 */
import { supabaseAdmin } from '../../db/supabase';

export interface DoctorProfile {
  id: string;
  name: string;
  specialty: string;
  consultation_fee_inr: number;
  avatar_url?: string;
}

/**
 * Fetch doctor profile by their user ID.
 * Used to enrich the frontend session with role-based data.
 */
export async function getDoctorProfile(userId: string): Promise<DoctorProfile | null> {
  const { data, error } = await supabaseAdmin
    .from('doctors')
    .select('id, name, specialty, consultation_fee_inr, avatar_url')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return data as DoctorProfile;
}

/**
 * Upsert (create or update) a doctor's profile after OAuth sign-in.
 */
export async function upsertDoctorProfile(userId: string, email: string, name: string) {
  const { data, error } = await supabaseAdmin
    .from('doctors')
    .upsert(
      { user_id: userId, email, name },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  if (error) throw new Error(`Failed to upsert doctor profile: ${error.message}`);
  return data;
}
