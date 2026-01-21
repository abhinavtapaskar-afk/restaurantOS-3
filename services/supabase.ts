import { createBrowserClient } from '@supabase/ssr';

// =================================================================================
// =================================================================================
//    ATTENTION: PASTE YOUR SUPABASE PROJECT CREDENTIALS HERE
// =================================================================================
// =================================================================================
//
// You can find your Project URL and Public Anon Key in your Supabase project dashboard.
// Go to: Settings > API
//
// 1. Replace the example URL below with your actual Project URL.
// 2. Replace the example key below with your actual Public Anon Key.
//
const supabaseUrl = 'https://wfspakabjjzxdawypgkd.supabase.co';
const supabaseAnonKey ='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indmc3Bha2Fiamp6eGRhd3lwZ2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NTUzMTAsImV4cCI6MjA4NDAzMTMxMH0.rHT3xak91ep46hLm7v6r8wxy9nu5lm6drttvMw7qfgI';
//
// =================================================================================
// =================================================================================


if (supabaseUrl.includes('your-project-id') || supabaseAnonKey.includes('your-public-anon-key')) {
  const errorMessage = "Supabase client is not configured. Please update the placeholder values in 'services/supabase.ts' with your actual Supabase project URL and public anon key.";
  console.error(errorMessage);
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
