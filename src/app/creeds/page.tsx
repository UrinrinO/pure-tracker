import { createClient } from '@/lib/supabase/server'
import { type Creed } from '@/types/database'
import CreedsClient from './CreedsClient'

export default async function CreedsPage() {
  const supabase = await createClient()

  const { data: creeds } = await supabase
    .from('creeds')
    .select('*, verses:creed_verses(*)')
    .order('order_index', { ascending: true })

  const withSortedVerses: Creed[] = (creeds ?? []).map((c: Creed) => ({
    ...c,
    verses: [...(c.verses ?? [])].sort((a, b) => a.verse_index - b.verse_index),
  }))

  return <CreedsClient initialCreeds={withSortedVerses} />
}
