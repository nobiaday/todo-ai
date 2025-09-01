export type Task = {
  id: string
  user_id: string
  title: string
  enhanced_title?: string | null
  description?: string | null
  status: 'todo' | 'done'
  steps?: any | null
  ai_suggestions?: any | null
  notes_count: number
  created_at: string
  updated_at: string
  user_email?: string | null;
  completed: boolean;
  notes?: any[] | null;
  source?: string | null;
}
