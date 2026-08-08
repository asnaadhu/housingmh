/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://cnlzyjqyzjqkfcqcuqyj.supabase.co';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNubHp5anF5empxa2ZjcWN1cXlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxOTQ2NDYsImV4cCI6MjEwMTc3MDY0Nn0.ExaqD-GcyvtoHRvtd083Pd-aJ3GvV2MCBib094QBhZQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = true;

export const SUPABASE_PROJECT_ID = 'cnlzyjqyzjqkfcqcuqyj';
export const SUPABASE_PROJECT_URL = 'https://cnlzyjqyzjqkfcqcuqyj.supabase.co';

// Helper to fetch remotely from Supabase property_state table
export async function fetchFromSupabase() {
  try {
    const { data, error } = await supabase
      .from('property_state')
      .select('payload')
      .eq('id', 'global_raw_v1')
      .maybeSingle();

    if (error) {
      console.warn('Supabase fetch notice:', error.message);
      return { data: null, error: error.message };
    }
    return { data: data?.payload || null, error: null };
  } catch (err: any) {
    const msg = err?.message || 'Connection failed';
    console.warn('Supabase fetch exception:', msg);
    return { data: null, error: msg };
  }
}

// Helper to persist to Supabase property_state table
export async function saveToSupabase(payload: any) {
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.buildings) || payload.buildings.length === 0) {
    console.warn('saveToSupabase skipped: payload is invalid or empty', payload);
    return { success: false, error: 'Cannot save empty or invalid property state' };
  }

  try {
    const { error } = await supabase
      .from('property_state')
      .upsert({
        id: 'global_raw_v1',
        payload: payload,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (error) {
      console.warn('Supabase save notice:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  } catch (err: any) {
    const msg = err?.message || 'Save failed';
    console.warn('Failed saving to Supabase:', msg);
    return { success: false, error: msg };
  }
}
