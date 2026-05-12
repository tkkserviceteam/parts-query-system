import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 型別定義
export interface Project {
  id: number;
  key: string;
  name: string;
  color_index: number;
}

export interface SubProject {
  id: number;
  project_key: string;
  name: string;
}

export interface Machine {
  id: number;
  project_key: string;
  sub_name: string;
  name: string;
  code_prefix?: string | null;
}

export interface FieldDef {
  id: number;
  field_key: string;
  label: string;
  field_type: string;
  is_required: boolean;
}

export interface PartType {
  id: number;
  name: string;
  color_index: number;
}

export interface Part {
  id: number;
  project_key: string;
  sub_name: string;
  pn: string;
  name: string;
  vendor?: string;
  machine?: string;
  model?: string;
  type_id?: number;
  status: 'active' | 'obs' | 'eol';
  description?: string;
  extra_data?: Record<string, any>;
  remark?: string;
}
