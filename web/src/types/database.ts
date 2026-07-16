export type Visibility = 'public' | 'private'
export type SessionStatus = 'active' | 'archived'
export type MemberRole = 'creator' | 'member'
export type PostType = 'comment' | 'progress'

export type Profile = {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
}

export type ReadingSession = {
  id: string
  creator_id: string
  title: string
  author: string
  visibility: Visibility
  join_code: string
  status: SessionStatus
  created_at: string
}

export type SessionChapter = {
  id: string
  session_id: string
  chapter_number: number
  chapter_title: string | null
  position: number
}

export type SessionMember = {
  session_id: string
  user_id: string
  role: MemberRole
  joined_at: string
}

export type MemberProgress = {
  session_id: string
  user_id: string
  chapter_id: string
  completed_at: string
}

export type ThreadPost = {
  id: string
  session_id: string
  user_id: string
  post_type: PostType
  body: string | null
  chapter_id: string | null
  created_at: string
  updated_at: string | null
  deleted_at: string | null
}

export type Reaction = {
  id: string
  post_id: string
  user_id: string
  emoji: string
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile> & { id: string }
        Update: Partial<Profile>
        Relationships: []
      }
      reading_sessions: {
        Row: ReadingSession
        Insert: Partial<ReadingSession> & { title: string; author: string; creator_id: string }
        Update: Partial<ReadingSession>
        Relationships: []
      }
      session_chapters: {
        Row: SessionChapter
        Insert: Partial<SessionChapter> & { session_id: string; chapter_number: number; position: number }
        Update: Partial<SessionChapter>
        Relationships: []
      }
      session_members: {
        Row: SessionMember
        Insert: Partial<SessionMember> & { session_id: string; user_id: string }
        Update: Partial<SessionMember>
        Relationships: []
      }
      member_progress: {
        Row: MemberProgress
        Insert: Partial<MemberProgress> & { session_id: string; user_id: string; chapter_id: string }
        Update: Partial<MemberProgress>
        Relationships: []
      }
      thread_posts: {
        Row: ThreadPost
        Insert: Partial<ThreadPost> & { session_id: string; user_id: string; post_type: PostType }
        Update: Partial<ThreadPost>
        Relationships: []
      }
      reactions: {
        Row: Reaction
        Insert: Partial<Reaction> & { post_id: string; user_id: string; emoji: string }
        Update: Partial<Reaction>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      join_session_by_code: { Args: { p_code: string }; Returns: string }
      regenerate_join_code: { Args: { p_session_id: string }; Returns: string }
      toggle_chapter_complete: {
        Args: {
          p_session_id: string
          p_chapter_id: string
          p_completed: boolean
          p_note?: string | null
        }
        Returns: undefined
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
