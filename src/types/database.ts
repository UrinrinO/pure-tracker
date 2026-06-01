// Database types matching the Supabase schema

export type Role = 'admin' | 'stakeholder'
export type TaskStatus = 'not_started' | 'in_progress' | 'blocked' | 'done'
export type TaskPriority = 'low' | 'med' | 'high' | 'critical'
export type NotificationType = 'behind_schedule' | 'message' | 'mention' | 'status'

export interface Profile {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  role: Role
  notify_email: boolean
  notify_push: boolean
  created_at: string
}

export interface Project {
  id: string
  name: string
  description: string | null
  created_by: string | null
  created_at: string
}

export interface Milestone {
  id: string
  project_id: string
  title: string
  description: string | null
  target_date: string | null
  order_index: number
  created_at: string
  // computed
  tasks?: Task[]
  percent_complete?: number
}

export interface Task {
  id: string
  project_id: string
  milestone_id: string | null
  title: string
  description: string | null
  owner: string | null
  owner_id: string | null
  status: TaskStatus
  priority: TaskPriority
  start_date: string | null
  due_date: string | null
  percent_complete: number
  task_code: string | null
  notes: string | null
  last_alerted_at: string | null
  created_at: string
  updated_at: string
  // joined
  milestone?: Milestone
}

export interface Comment {
  id: string
  project_id: string
  task_id: string | null
  author_id: string
  body: string
  created_at: string
  // joined
  author?: Profile
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  link: string | null
  read: boolean
  created_at: string
}

export interface Invitation {
  id: string
  project_id: string
  email: string
  role: Role
  token: string
  accepted: boolean
  invited_by: string | null
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> }
      projects: { Row: Project; Insert: Partial<Project>; Update: Partial<Project> }
      milestones: { Row: Milestone; Insert: Partial<Milestone>; Update: Partial<Milestone> }
      tasks: { Row: Task; Insert: Partial<Task>; Update: Partial<Task> }
      comments: { Row: Comment; Insert: Partial<Comment>; Update: Partial<Comment> }
      notifications: { Row: Notification; Insert: Partial<Notification>; Update: Partial<Notification> }
      invitations: { Row: Invitation; Insert: Partial<Invitation>; Update: Partial<Invitation> }
    }
  }
}
