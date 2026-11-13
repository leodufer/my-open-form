export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Question types supported by the form builder
export type QuestionType =
  | 'statement'
  | 'short_text'
  | 'long_text'
  | 'dropdown'
  | 'checkboxes'
  | 'email'
  | 'phone'
  | 'number'
  | 'date'
  | 'rating'
  | 'opinion_scale'
  | 'yes_no'
  | 'file_upload'
  | 'url'

// Form status
export type FormStatus = 'draft' | 'published' | 'closed'

// Theme presets
export type ThemePreset = 
  | 'midnight'
  | 'ocean'
  | 'sunset'
  | 'forest'
  | 'lavender'
  | 'minimal'

export interface ThemeConfig {
  id: ThemePreset
  name: string
  primaryColor: string
  backgroundColor: string
  textColor: string
  accentColor: string
  fontFamily: string
}

// Question configuration
export interface QuestionConfig {
  id: string
  reusableQuestionId?: string
  segmentId?: string
  segmentQuestionId?: string
  type: QuestionType
  title: string
  description?: string
  required: boolean
  // Type-specific options
  options?: string[] // For dropdown and checkboxes
  minValue?: number // For rating (1-5 stars) or opinion_scale (1-10)
  maxValue?: number
  allowedFileTypes?: string[] // For file_upload
  maxFileSize?: number // In MB
  placeholder?: string
  buttonText?: string // For statement
}

// Database tables
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: 'admin' | 'user'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'admin' | 'user'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'admin' | 'user'
          updated_at?: string
        }
      }
      collections: {
        Row: {
          id: string
          user_id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          updated_at?: string
        }
      }
      reusable_questions: {
        Row: {
          id: string
          user_id: string
          type: QuestionType
          title: string
          description: string | null
          required: boolean
          config: Omit<QuestionConfig, 'id' | 'reusableQuestionId' | 'type' | 'title' | 'description' | 'required'>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: QuestionType
          title: string
          description?: string | null
          required?: boolean
          config?: Omit<QuestionConfig, 'id' | 'reusableQuestionId' | 'type' | 'title' | 'description' | 'required'>
          created_at?: string
          updated_at?: string
        }
        Update: {
          type?: QuestionType
          title?: string
          description?: string | null
          required?: boolean
          config?: Omit<QuestionConfig, 'id' | 'reusableQuestionId' | 'type' | 'title' | 'description' | 'required'>
          updated_at?: string
        }
      }
      question_segments: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          questions: QuestionConfig[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          questions?: QuestionConfig[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          description?: string | null
          questions?: QuestionConfig[]
          updated_at?: string
        }
      }
      forms: {
        Row: {
          id: string
          user_id: string
          collection_id: string | null
          title: string
          description: string | null
          slug: string
          status: FormStatus
          theme: ThemePreset
          questions: QuestionConfig[]
          thank_you_message: string
          allow_multiple_submissions: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          collection_id?: string | null
          title: string
          description?: string | null
          slug: string
          status?: FormStatus
          theme?: ThemePreset
          questions?: QuestionConfig[]
          thank_you_message?: string
          allow_multiple_submissions?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          collection_id?: string | null
          title?: string
          description?: string | null
          slug?: string
          status?: FormStatus
          theme?: ThemePreset
          questions?: QuestionConfig[]
          thank_you_message?: string
          allow_multiple_submissions?: boolean
          updated_at?: string
        }
      }
      responses: {
        Row: {
          id: string
          form_id: string
          answers: Record<string, Json>
          submitted_at: string
        }
        Insert: {
          id?: string
          form_id: string
          answers: Record<string, Json>
          submitted_at?: string
        }
        Update: {
          answers?: Record<string, Json>
        }
      }
    }
  }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Collection = Database['public']['Tables']['collections']['Row']
export type ReusableQuestion = Database['public']['Tables']['reusable_questions']['Row']
export type ReusableQuestionInsert = Database['public']['Tables']['reusable_questions']['Insert']
export type ReusableQuestionUpdate = Database['public']['Tables']['reusable_questions']['Update']
export type QuestionSegment = Database['public']['Tables']['question_segments']['Row']
export type QuestionSegmentInsert = Database['public']['Tables']['question_segments']['Insert']
export type QuestionSegmentUpdate = Database['public']['Tables']['question_segments']['Update']
export type Form = Database['public']['Tables']['forms']['Row']
export type FormInsert = Database['public']['Tables']['forms']['Insert']
export type FormUpdate = Database['public']['Tables']['forms']['Update']
export type Response = Database['public']['Tables']['responses']['Row']
export type ResponseInsert = Database['public']['Tables']['responses']['Insert']

