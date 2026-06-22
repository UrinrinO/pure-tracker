import { createClient } from '@/lib/supabase/server'
import { type TrainingModule, type TrainingModuleNote, type TrainingCourse } from '@/types/database'
import { notFound } from 'next/navigation'
import ModuleClient from './ModuleClient'

export default async function ModulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // RLS scopes every row to the current user, so no explicit user_id filter.
  const { data: module } = await supabase
    .from('training_modules')
    .select('*, course:training_courses(id, title, status)')
    .eq('id', id)
    .single<TrainingModule & { course: Pick<TrainingCourse, 'id' | 'title' | 'status'> | null }>()

  if (!module) notFound()

  const { data: notes } = await supabase
    .from('training_module_notes')
    .select('*')
    .eq('module_id', id)
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: true })

  return (
    <ModuleClient
      module={module}
      course={module.course ?? null}
      initialNotes={(notes ?? []) as TrainingModuleNote[]}
    />
  )
}
