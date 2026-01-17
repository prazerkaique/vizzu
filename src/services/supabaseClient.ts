import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dbdqiqehuapcicejnzyd.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiZHFpcWVodWFwY2ljZWpuenlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MjMxMjUsImV4cCI6MjA4NDA5OTEyNX0.LDcIu4VPBifzmy8z-lKkjqzgWo8-d8C0VjLl1XSWJiQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
