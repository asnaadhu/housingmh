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
      console.warn('Supabase fetch notice (property_state table may not be initialized yet):', error.message);
      return null;
    }
    return data?.payload || null;
  } catch (err) {
    console.warn('Supabase connection or query error:', err);
    return null;
  }
}

// Helper to persist to Supabase property_state table
export async function saveToSupabase(payload: any) {
  try {
    const { error } = await supabase
      .from('property_state')
      .upsert({
        id: 'global_raw_v1',
        payload,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (error) {
      console.warn('Supabase save notice (table property_state might need creation):', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Failed saving to Supabase:', err);
    return false;
  }
}
