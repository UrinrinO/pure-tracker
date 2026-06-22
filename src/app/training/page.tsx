import { createClient } from '@/lib/supabase/server'
import { type TrainingCourse } from '@/types/database'
import TrainingClient from './TrainingClient'

export default async function TrainingPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // RLS scopes these rows to the current user, so no explicit user_id filter.
  const { data: courses } = await supabase
    .from('training_courses')
    .select('*, modules:training_modules(*)')
    .order('order_index', { ascending: true })

  const withProgress: TrainingCourse[] = (courses ?? []).map((c: TrainingCourse) => {
    const modules = [...(c.modules ?? [])].sort((a, b) => a.order_index - b.order_index)
    const done = modules.filter(m => m.completed).length
    return {
      ...c,
      modules,
      percent_complete: modules.length ? Math.round((done / modules.length) * 100) : 0,
    }
  })

  return <TrainingClient initialCourses={withProgress} userId={user?.id ?? ''} />
}
