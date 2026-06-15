'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Creed, type CreedType } from '@/types/database'
import {
  Plus, Trash2, BookHeart, Music, ChevronDown, ChevronUp,
  ToggleLeft, ToggleRight, X, GripVertical, Pencil,
} from 'lucide-react'
import DeleteConfirmModal from '@/components/DeleteConfirmModal'

const ALL_TRANSLATIONS = ['NKJV', 'KJV', 'NIV', 'ESV', 'AMP', 'NLT'] as const
type TranslationVerses = Record<string, { label: string; content: string }[]>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: CreedType }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 10px', borderRadius: 999, fontSize: 10.5, fontWeight: 600,
      letterSpacing: '0.06em', textTransform: 'uppercase',
      background: type === 'hymn' ? 'rgba(26,51,92,0.08)' : 'rgba(63,110,88,0.10)',
      color: type === 'hymn' ? '#1A335C' : '#3F6E58',
    }}>
      {type === 'hymn' ? <Music size={10} /> : <BookHeart size={10} />}
      {type === 'hymn' ? 'Hymn' : 'Scripture'}
    </span>
  )
}

// ─── Verse list editor ────────────────────────────────────────────────────────

function VerseList({
  verses, onChange, labelPrefix,
}: {
  verses: { label: string; content: string }[]
  onChange: (v: { label: string; content: string }[]) => void
  labelPrefix: string
}) {
  function update(idx: number, field: 'label' | 'content', val: string) {
    onChange(verses.map((v, i) => i === idx ? { ...v, [field]: val } : v))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {verses.map((v, idx) => (
        <div key={idx} style={{ background: 'var(--cream-2)', borderRadius: 10, padding: '12px 12px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <GripVertical size={13} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
            <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {labelPrefix} {idx + 1}
            </span>
            <input
              value={v.label}
              onChange={e => update(idx, 'label', e.target.value)}
              placeholder="Label"
              style={{ width: 56, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--line)', fontSize: 11.5, background: '#fff', color: 'var(--ink)' }}
            />
            <button
              onClick={() => onChange(verses.filter((_, i) => i !== idx))}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#B4452F', padding: 2 }}
            >
              <X size={13} />
            </button>
          </div>
          <textarea
            value={v.content}
            onChange={e => update(idx, 'content', e.target.value)}
            rows={3}
            placeholder="Enter text here…"
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 8,
              border: '1px solid var(--line)', fontSize: 13, lineHeight: 1.6,
              background: '#fff', color: 'var(--ink)', resize: 'vertical',
              fontFamily: "'Playfair Display', serif", boxSizing: 'border-box',
            }}
          />
        </div>
      ))}
      <button
        onClick={() => onChange([...verses, { label: String(verses.length + 1), content: '' }])}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8,
          border: '1.5px dashed rgba(26,51,92,0.20)', background: 'transparent',
          color: 'var(--ink-3)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', width: 'fit-content',
        }}
      >
        <Plus size={13} />
        Add {labelPrefix.toLowerCase()}
      </button>
    </div>
  )
}

// ─── Shared Creed Drawer (add + edit) ────────────────────────────────────────

function buildInitialTabs(creed: Creed): TranslationVerses {
  const verses = [...(creed.verses ?? [])].sort((a, b) => a.verse_index - b.verse_index)
  const tabs: TranslationVerses = {}
  for (const v of verses) {
    const key = v.translation ?? '__none__'
    if (!tabs[key]) tabs[key] = []
    tabs[key].push({ label: v.verse_label ?? String(tabs[key].length + 1), content: v.content })
  }
  return tabs
}

function CreedDrawer({
  editCreed,
  onClose,
  onDone,
}: {
  editCreed?: Creed
  onClose: () => void
  onDone: (creed: Creed) => void
}) {
  const supabase = createClient()
  const isEditing = !!editCreed

  // ── Field state ────────────────────────────────────────────────────────────
  const [type]  = useState<CreedType>(editCreed?.type ?? 'hymn')  // locked after creation
  const [title, setTitle]   = useState(editCreed?.title ?? '')
  const [author, setAuthor] = useState(editCreed?.author ?? '')
  const [typeChoice, setTypeChoice] = useState<CreedType>(editCreed?.type ?? 'hymn')

  // Hymn verses
  const [hymnVerses, setHymnVerses] = useState<{ label: string; content: string }[]>(
    isEditing && editCreed?.type === 'hymn'
      ? (editCreed.verses ?? [])
          .sort((a, b) => a.verse_index - b.verse_index)
          .map(v => ({ label: v.verse_label ?? String(v.verse_index + 1), content: v.content }))
      : [{ label: '1', content: '' }]
  )

  // Scripture: keyed by translation
  const [translationTabs, setTranslationTabs] = useState<TranslationVerses>(
    isEditing && editCreed?.type === 'scripture'
      ? buildInitialTabs(editCreed)
      : { NKJV: [{ label: '1', content: '' }] }
  )
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (isEditing && editCreed?.type === 'scripture') {
      return editCreed.translation ?? Object.keys(buildInitialTabs(editCreed))[0] ?? 'NKJV'
    }
    return 'NKJV'
  })
  const [showTranslationPicker, setShowTranslationPicker] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  const effectiveType = isEditing ? type : typeChoice
  const usedTranslations    = Object.keys(translationTabs)
  const availableTranslations = ALL_TRANSLATIONS.filter(t => !usedTranslations.includes(t))

  function addTranslation(t: string) {
    const firstVerses = translationTabs[usedTranslations[0]] ?? []
    setTranslationTabs(prev => ({
      ...prev,
      [t]: firstVerses.map(v => ({ label: v.label, content: '' })),
    }))
    setActiveTab(t)
    setShowTranslationPicker(false)
  }

  function removeTranslation(t: string) {
    if (usedTranslations.length <= 1) return
    const next = { ...translationTabs }
    delete next[t]
    setTranslationTabs(next)
    if (activeTab === t) setActiveTab(Object.keys(next)[0])
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function save() {
    if (!title.trim()) { setError('Title / reference is required.'); return }

    if (effectiveType === 'hymn') {
      if (hymnVerses.some(v => !v.content.trim())) { setError('All stanza fields must have content.'); return }
    } else {
      for (const [trans, vv] of Object.entries(translationTabs)) {
        if (vv.some(v => !v.content.trim())) { setError(`Fill in all verses for ${trans}.`); return }
      }
    }

    setSaving(true)
    setError(null)

    const defaultTranslation = effectiveType === 'scripture' ? usedTranslations[0] : null

    const creedPayload = {
      type: effectiveType,
      title: title.trim(),
      author: effectiveType === 'hymn' ? (author.trim() || null) : null,
      translation: defaultTranslation,
    }

    let creedId: string

    if (isEditing) {
      const { error: updErr } = await supabase
        .from('creeds')
        .update(creedPayload)
        .eq('id', editCreed!.id)
      if (updErr) { setError(updErr.message); setSaving(false); return }
      creedId = editCreed!.id

      // Delete existing verses and re-insert
      await supabase.from('creed_verses').delete().eq('creed_id', creedId)
    } else {
      const { data: newCreed, error: insErr } = await supabase
        .from('creeds')
        .insert(creedPayload)
        .select()
        .single()
      if (insErr || !newCreed) { setError(insErr?.message ?? 'Failed to create creed.'); setSaving(false); return }
      creedId = newCreed.id
    }

    // Build verse rows
    const verseRows = effectiveType === 'hymn'
      ? hymnVerses.map((v, idx) => ({
          creed_id: creedId,
          verse_index: idx,
          verse_label: v.label.trim() || String(idx + 1),
          translation: null,
          content: v.content.trim(),
        }))
      : Object.entries(translationTabs).flatMap(([trans, vv]) =>
          vv.map((v, idx) => ({
            creed_id: creedId,
            verse_index: idx,
            verse_label: v.label.trim() || String(idx + 1),
            translation: trans,
            content: v.content.trim(),
          }))
        )

    const { error: versesErr } = await supabase.from('creed_verses').insert(verseRows as object[])
    if (versesErr) { setError(versesErr.message); setSaving(false); return }

    // Re-fetch the creed with fresh verses so the list updates
    const { data: fresh } = await supabase
      .from('creeds')
      .select('*, verses:creed_verses(*)')
      .eq('id', creedId)
      .single()

    if (fresh) {
      onDone({
        ...fresh,
        verses: [...(fresh.verses ?? [])].sort((a: { verse_index: number }, b: { verse_index: number }) => a.verse_index - b.verse_index),
      })
    } else {
      onDone({ id: creedId, ...creedPayload, active: editCreed?.active ?? true, order_index: 0, created_by: null, created_at: '', verses: [] })
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(14,31,61,0.3)', zIndex: 50 }} />

      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 480,
        background: '#FBFAF6', boxShadow: '-8px 0 32px rgba(14,31,61,0.12)',
        zIndex: 51, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold-deep)', marginBottom: 2 }}>Reflections</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 600, color: 'var(--navy-ink)', margin: 0 }}>
              {isEditing ? 'Edit Reflection' : 'Add New Reflection'}
            </h2>
            {isEditing && (
              <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '4px 0 0' }}>
                Type is locked — create a new reflection to change it.
              </p>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Type toggle — only shown when adding */}
          {!isEditing && (
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>Type</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['hymn', 'scripture'] as CreedType[]).map(t => (
                  <button key={t} onClick={() => setTypeChoice(t)} style={{
                    flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer',
                    border: typeChoice === t ? '2px solid #C9A84C' : '2px solid var(--line)',
                    background: typeChoice === t ? 'rgba(201,168,76,0.08)' : '#fff',
                    color: typeChoice === t ? '#8B7426' : 'var(--ink-3)',
                    fontWeight: typeChoice === t ? 700 : 500, fontSize: 13,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                    {t === 'hymn' ? <Music size={14} /> : <BookHeart size={14} />}
                    {t === 'hymn' ? 'Hymn' : 'Scripture'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Type badge in edit mode */}
          {isEditing && (
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>Type</label>
              <TypeBadge type={effectiveType} />
            </div>
          )}

          {/* Title */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6 }}>
              {effectiveType === 'hymn' ? 'Hymn Title' : 'Scripture Reference'}
            </label>
            <input
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder={effectiveType === 'hymn' ? 'e.g. O Thou Who Camest From Above' : 'e.g. Luke 10:18-19'}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--line)', fontSize: 14, background: '#fff', color: 'var(--navy-ink)', boxSizing: 'border-box' }}
            />
          </div>

          {/* Author — hymn only */}
          {effectiveType === 'hymn' && (
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6 }}>Author</label>
              <input
                value={author} onChange={e => setAuthor(e.target.value)}
                placeholder="e.g. Charles Wesley"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--line)', fontSize: 14, background: '#fff', color: 'var(--navy-ink)', boxSizing: 'border-box' }}
              />
            </div>
          )}

          {/* Scripture: translation tabs */}
          {effectiveType === 'scripture' && (
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>
                Translations
              </label>

              {/* Tab row */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
                {usedTranslations.map(t => (
                  <button key={t} onClick={() => setActiveTab(t)} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 10px 5px 12px', borderRadius: 999, cursor: 'pointer',
                    fontSize: 12, fontWeight: 700,
                    border: activeTab === t ? '2px solid #1A335C' : '2px solid var(--line)',
                    background: activeTab === t ? '#1A335C' : '#fff',
                    color: activeTab === t ? '#fff' : 'var(--ink-3)',
                  }}>
                    {t}
                    {usedTranslations.length > 1 && (
                      <span
                        onClick={e => { e.stopPropagation(); removeTranslation(t) }}
                        style={{ display: 'flex', alignItems: 'center', opacity: 0.65, cursor: 'pointer' }}
                      >
                        <X size={10} />
                      </span>
                    )}
                  </button>
                ))}

                {availableTranslations.length > 0 && (
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setShowTranslationPicker(p => !p)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '5px 12px', borderRadius: 999, cursor: 'pointer',
                        fontSize: 12, fontWeight: 600,
                        border: '1.5px dashed rgba(26,51,92,0.25)', background: 'transparent', color: 'var(--ink-3)',
                      }}
                    >
                      <Plus size={11} /> Add translation
                    </button>
                    {showTranslationPicker && (
                      <div style={{
                        position: 'absolute', top: '110%', left: 0, zIndex: 10,
                        background: '#fff', border: '1px solid var(--line)', borderRadius: 10,
                        boxShadow: '0 4px 16px rgba(14,31,61,0.12)',
                        padding: 6, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 100,
                      }}>
                        {availableTranslations.map(t => (
                          <button key={t} onClick={() => addTranslation(t)}
                            style={{ padding: '7px 12px', borderRadius: 7, border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--cream-2)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Active tab verses */}
              <VerseList
                key={activeTab}
                verses={translationTabs[activeTab] ?? []}
                onChange={vv => setTranslationTabs(prev => ({ ...prev, [activeTab]: vv }))}
                labelPrefix="Verse"
              />
            </div>
          )}

          {/* Hymn verses */}
          {effectiveType === 'hymn' && (
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>Stanzas</label>
              <VerseList verses={hymnVerses} onChange={setHymnVerses} labelPrefix="Stanza" />
            </div>
          )}

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(180,69,47,0.08)', border: '1px solid rgba(180,69,47,0.20)', color: '#B4452F', fontSize: 13 }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--line)', display: 'flex', gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} disabled={saving}
            style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: '1.5px solid var(--line)', background: '#fff', color: 'var(--ink-3)', fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={save} disabled={saving}
            style={{ flex: 2, padding: '11px 0', borderRadius: 10, border: 'none', background: saving ? 'var(--ink-3)' : 'linear-gradient(160deg, #22406E, #1A335C)', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: saving ? 'default' : 'pointer' }}>
            {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Save Reflection'}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Creed Row ────────────────────────────────────────────────────────────────

function CreedRow({ creed, onEdit, onToggle, onDelete }: {
  creed: Creed
  onEdit: (creed: Creed) => void
  onToggle: (id: string, active: boolean) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const translations = creed.type === 'scripture'
    ? [...new Set((creed.verses ?? []).map(v => v.translation).filter(Boolean) as string[])]
    : []

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--line)', overflow: 'hidden', opacity: creed.active ? 1 : 0.55, transition: 'opacity 0.2s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
        <TypeBadge type={creed.type} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy-ink)', fontFamily: "'Playfair Display', serif" }}>
            {creed.title}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>
            {creed.type === 'hymn'
              ? (creed.author ?? 'Unknown author')
              : translations.join(' · ')}
            {' · '}
            {creed.type === 'hymn'
              ? `${creed.verses?.length ?? 0} stanzas`
              : `${[...new Set((creed.verses ?? []).map(v => v.verse_label))].length} verses`}
          </div>
        </div>

        {/* Edit */}
        <button onClick={() => onEdit(creed)} title="Edit"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 4 }}>
          <Pencil size={14} />
        </button>

        {/* Active toggle */}
        <button
          onClick={async () => { setToggling(true); await onToggle(creed.id, !creed.active); setToggling(false) }}
          disabled={toggling} title={creed.active ? 'Deactivate' : 'Activate'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: creed.active ? '#3F6E58' : 'var(--ink-3)', padding: 4 }}>
          {creed.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
        </button>

        {/* Delete */}
        <button
          onClick={() => setConfirmDelete(true)}
          disabled={deleting} title="Delete"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B4452F', padding: 4 }}>
          <Trash2 size={15} />
        </button>

        {/* Expand */}
        <button onClick={() => setExpanded(e => !e)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 4 }}>
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--line)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {creed.type === 'scripture' && translations.length > 0 && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 4 }}>
              {translations.map(t => (
                <span key={t} style={{ padding: '2px 9px', borderRadius: 999, fontSize: 10.5, fontWeight: 700, background: '#1A335C', color: '#fff' }}>{t}</span>
              ))}
            </div>
          )}
          {/* Preview: default translation only */}
          {(creed.verses ?? [])
            .filter(v => creed.type === 'hymn' || v.translation === (creed.translation ?? translations[0]))
            .sort((a, b) => a.verse_index - b.verse_index)
            .map((v, i) => (
              <div key={v.id ?? i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{
                  flexShrink: 0, width: 20, height: 20, borderRadius: '50%',
                  background: 'rgba(201,168,76,0.12)', color: '#8B7426',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 700, marginTop: 2,
                }}>
                  {v.verse_label ?? String(i + 1)}
                </span>
                <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--ink)', fontFamily: "'Playfair Display', serif", margin: 0, fontStyle: 'italic' }}>
                  {v.content}
                </p>
              </div>
            ))}
        </div>
      )}

      {confirmDelete && (
        <DeleteConfirmModal
          title="Delete Reflection?"
          message={<>Are you sure you want to delete <strong>{creed.title}</strong>? This cannot be undone.</>}
          onConfirm={async () => { setConfirmDelete(false); setDeleting(true); await onDelete(creed.id) }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CreedsClient({ initialCreeds }: { initialCreeds: Creed[] }) {
  const supabase = createClient()
  const [creeds, setCreeds] = useState<Creed[]>(initialCreeds)
  const [showAdd, setShowAdd] = useState(false)
  const [editCreed, setEditCreed] = useState<Creed | null>(null)

  const hymns     = creeds.filter(c => c.type === 'hymn')
  const scriptures = creeds.filter(c => c.type === 'scripture')

  async function handleToggle(id: string, active: boolean) {
    await supabase.from('creeds').update({ active }).eq('id', id)
    setCreeds(prev => prev.map(c => c.id === id ? { ...c, active } : c))
  }

  async function handleDelete(id: string) {
    await supabase.from('creeds').delete().eq('id', id)
    setCreeds(prev => prev.filter(c => c.id !== id))
  }

  function handleDone(creed: Creed) {
    setCreeds(prev => {
      const existing = prev.find(c => c.id === creed.id)
      return existing
        ? prev.map(c => c.id === creed.id ? creed : c)
        : [...prev, creed]
    })
    setShowAdd(false)
    setEditCreed(null)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Content Management</div>
          <h1 className="page-title">Reflections</h1>
          <p className="page-subtitle">Hymns and scriptures shown on the dashboard</p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 10, border: 'none',
          background: 'linear-gradient(160deg, #22406E, #1A335C)', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
        }}>
          <Plus size={15} /> Add Reflection
        </button>
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Music size={14} style={{ color: '#1A335C' }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Hymns ({hymns.length})</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {hymns.length === 0
              ? <div style={{ color: 'var(--ink-3)', fontSize: 13.5, padding: '20px 0' }}>No hymns yet. Add one above.</div>
              : hymns.map(c => <CreedRow key={c.id} creed={c} onEdit={setEditCreed} onToggle={handleToggle} onDelete={handleDelete} />)}
          </div>
        </section>

        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <BookHeart size={14} style={{ color: '#3F6E58' }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Scripture ({scriptures.length})</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {scriptures.length === 0
              ? <div style={{ color: 'var(--ink-3)', fontSize: 13.5, padding: '20px 0' }}>No scripture passages yet. Add one above.</div>
              : scriptures.map(c => <CreedRow key={c.id} creed={c} onEdit={setEditCreed} onToggle={handleToggle} onDelete={handleDelete} />)}
          </div>
        </section>

      </div>

      {(showAdd || editCreed) && (
        <CreedDrawer
          editCreed={editCreed ?? undefined}
          onClose={() => { setShowAdd(false); setEditCreed(null) }}
          onDone={handleDone}
        />
      )}
    </div>
  )
}
