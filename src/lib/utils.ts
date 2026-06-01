import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { type TaskStatus, type TaskPriority } from '@/types/database'
import { format, isAfter, isBefore, startOfDay } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function statusLabel(status: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    not_started: 'Not Started',
    in_progress: 'In Progress',
    blocked: 'Blocked',
    done: 'Done',
  }
  return map[status]
}

export function statusBadgeClass(status: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    not_started: 'badge badge-not-started',
    in_progress: 'badge badge-in-progress',
    blocked: 'badge badge-blocked',
    done: 'badge badge-done',
  }
  return map[status]
}

export function priorityBadgeClass(priority: TaskPriority): string {
  const map: Record<TaskPriority, string> = {
    critical: 'badge badge-critical',
    high: 'badge badge-high',
    med: 'badge badge-med',
    low: 'badge badge-low',
  }
  return map[priority]
}

export function priorityLabel(priority: TaskPriority): string {
  const map: Record<TaskPriority, string> = {
    critical: 'Critical',
    high: 'High',
    med: 'Medium',
    low: 'Low',
  }
  return map[priority]
}

export function isOverdue(dueDate: string | null, status: TaskStatus): boolean {
  if (!dueDate || status === 'done') return false
  return isBefore(new Date(dueDate), startOfDay(new Date()))
}

export function formatDate(date: string | null): string {
  if (!date) return '—'
  return format(new Date(date), 'MMM d, yyyy')
}

export function formatDateShort(date: string | null): string {
  if (!date) return '—'
  return format(new Date(date), 'MMM d')
}

export function getMilestoneProgress(tasks: { status: string }[]): number {
  if (!tasks.length) return 0
  const done = tasks.filter(t => t.status === 'done').length
  return Math.round((done / tasks.length) * 100)
}

export function getInitials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function timeAgo(date: string): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `${diffD}d ago`
  return formatDateShort(date)
}
