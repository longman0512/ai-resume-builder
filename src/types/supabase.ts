/* eslint-disable @typescript-eslint/no-explicit-any */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          email: string;
          role: string;
          resumes_built: number;
          created_at: string;
          last_login_at: string;
        };
        Insert: {
          id: string;
          name?: string;
          email?: string;
          role?: string;
          resumes_built?: number;
          created_at?: string;
          last_login_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          role?: string;
          resumes_built?: number;
          created_at?: string;
          last_login_at?: string;
        };
        Relationships: [];
      };
      saved_resumes: {
        Row: {
          id: string;
          user_id: string;
          stack_info: string;
          description: string;
          resume_data: Json;
          original_resume: string;
          job_desc: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stack_info?: string;
          description?: string;
          resume_data: Json;
          original_resume?: string;
          job_desc?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stack_info?: string;
          description?: string;
          resume_data?: Json;
          original_resume?: string;
          job_desc?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'saved_resumes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
