'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Creed, type CreedVerse } from '@/types/database'
import { ChevronLeft, ChevronRight, Music, BookHeart, X, SkipForward, SkipBack, Pause } from 'lucide-react'
import { useCreedStore } from '@/stores/creedStore'

// ─── Timing ──────────────────────────────────────────────────────────────────

const VERSE_MS = 10_000
const BREAK_MS = 60 * 1000

// ─── Data helpers ─────────────────────────────────────────────────────────────

function getDefaultTranslation(creed: Creed): string | null {
  if (creed.type === 'hymn') return null
  if (creed.translation) return creed.translation
  return (creed.verses ?? []).find(v => v.translation)?.translation ?? null
}

function getTranslations(creed: Creed): string[] {
  return [...new Set(
    (creed.verses ?? []).map(v => v.translation).filter(Boolean) as string[]
  )]
}

function getVersesForTranslation(creed: Creed, translation: string | null): CreedVerse[] {
  const all = creed.verses ?? []
  const sort = (v: CreedVerse[]) => [...v].sort((a, b) => a.verse_index - b.verse_index)
  return creed.type === 'hymn' ? sort(all) : sort(all.filter(v => v.translation === translation))
}

interface Slide {
  creed: Creed
  verse: CreedVerse
  verseTotal: number
  versePosition: number
}

function buildChunks(creeds: Creed[]): Slide[][] {
  const chunks: Slide[][] = []
  for (const creed of creeds) {
    const defTrans = getDefaultTranslation(creed)
    const verses = getVersesForTranslation(creed, defTrans)
    if (!verses.length) continue
    chunks.push(
      verses.map((verse, i) => ({ creed, verse, verseTotal: verses.length, versePosition: i + 1 }))
    )
  }
  return chunks
}

function resolveDisplayVerse(slide: Slide, selectedTranslation: string | null): CreedVerse {
  if (slide.creed.type === 'hymn' || !selectedTranslation) return slide.verse
  if (selectedTranslation === slide.verse.translation) return slide.verse
  const match = (slide.creed.verses ?? []).find(
    v => v.translation === selectedTranslation && v.verse_label === slide.verse.verse_label
  )
  return match ?? slide.verse
}

function fmtTime(ms: number) {
  const s = Math.ceil(ms / 1000)
  const m = Math.floor(s / 60)
  return m > 0 ? `${m}m ${(s % 60).toString().padStart(2, '0')}s` : `${s}s`
}

// ─── Minimized pill ───────────────────────────────────────────────────────────

function MinimizedPill({ breakLeft, onSkip }: { breakLeft: number; onSkip: () => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'rgba(26,51,92,0.92)', backdropFilter: 'blur(8px)',
      borderRadius: 999, padding: '8px 14px 8px 12px',
      boxShadow: '0 4px 16px rgba(14,31,61,0.20)',
    }}>
      <BookHeart size={13} style={{ color: '#C9A84C', flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap' }}>
        Our Creeds · next in <strong style={{ color: '#fff' }}>{fmtTime(breakLeft)}</strong>
      </span>
      <button onClick={onSkip} title="Show next creed now" style={{
        background: 'rgba(201,168,76,0.20)', border: 'none', cursor: 'pointer',
        borderRadius: '50%', width: 24, height: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#C9A84C', flexShrink: 0, padding: 0,
      }}>
        <SkipForward size={12} />
      </button>
    </div>
  )
}

// ─── Creed card ──────────────────────────────────────────────────────────────

function CreedCard({
  slide, selectedTranslation, isHovered,
  onSelectTranslation, onPrevVerse, onNextVerse,
  onNextCreed, onPrevCreed, onDismiss, entering,
  isFirstVerse, isLastVerse,
}: {
  slide: Slide
  selectedTranslation: string | null
  isHovered: boolean
  onSelectTranslation: (t: string) => void
  onPrevVerse: () => void
  onNextVerse: () => void
  onNextCreed: () => void
  onPrevCreed: () => void
  onDismiss: () => void
  entering: boolean
  isFirstVerse: boolean
  isLastVerse: boolean
}) {
  const { creed, verseTotal, versePosition } = slide
  const isHymn = creed.type === 'hymn'
  const displayVerse = resolveDisplayVerse(slide, selectedTranslation)
  const translations = isHymn ? [] : getTranslations(creed)
  const activeTrans = selectedTranslation ?? getDefaultTranslation(creed)

  const navBarBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    width: '100%', padding: '10px 14px', border: 'none', cursor: 'pointer',
    fontSize: 12, fontWeight: 600, letterSpacing: '0.04em',
    transition: 'background 0.15s',
  }

  return (
    <div style={{
      width: 340,
      background: '#fff',
      borderRadius: 18,
      boxShadow: '0 8px 32px -6px rgba(14,31,61,0.18), 0 2px 8px rgba(14,31,61,0.08)',
      overflow: 'hidden',
      opacity: entering ? 0 : 1,
      transform: entering ? 'translateY(12px)' : 'translateY(0)',
      transition: 'opacity 0.35s ease, transform 0.35s ease',
    }}>

      {/* Prev-creed bar — first verse only */}
      {isFirstVerse && (
        <button
          onClick={onPrevCreed}
          style={{
            ...navBarBase,
            background: 'rgba(26,51,92,0.65)',
            color: 'rgba(255,255,255,0.85)',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,51,92,0.85)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(26,51,92,0.65)'}
        >
          <SkipBack size={12} />
          Previous creed
        </button>
      )}

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '11px 14px 10px',
        background: isHymn ? 'rgba(26,51,92,0.05)' : 'rgba(63,110,88,0.06)',
        borderBottom: '1px solid rgba(14,31,61,0.06)',
        borderTop: isFirstVerse ? '1px solid rgba(14,31,61,0.06)' : undefined,
      }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          background: isHymn ? 'rgba(26,51,92,0.10)' : 'rgba(63,110,88,0.12)',
          color: isHymn ? '#1A335C' : '#3F6E58',
        }}>
          {isHymn ? <Music size={9} /> : <BookHeart size={9} />}
          Our Creeds
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Pause indicator */}
          {isHovered && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              background: 'rgba(201,168,76,0.15)', color: '#8B7426',
            }}>
              <Pause size={9} />
              Paused
            </span>
          )}
          <button onClick={onDismiss} title="Dismiss" style={{
            width: 26, height: 26, borderRadius: '50%',
            border: '1px solid rgba(14,31,61,0.12)',
            background: 'transparent', cursor: 'pointer', color: 'var(--ink-3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={11} />
          </button>
        </div>
      </div>

      {/* Translation switcher — scripture only */}
      {!isHymn && translations.length > 1 && (
        <div style={{ display: 'flex', gap: 5, padding: '10px 14px 0', flexWrap: 'wrap' }}>
          {translations.map(t => (
            <button key={t} onClick={() => onSelectTranslation(t)} style={{
              padding: '3px 10px', borderRadius: 999, cursor: 'pointer',
              fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', border: 'none',
              background: t === activeTrans ? '#1A335C' : 'rgba(26,51,92,0.08)',
              color: t === activeTrans ? '#fff' : '#1A335C',
              transition: 'background 0.15s, color 0.15s',
            }}>
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Verse content */}
      <div style={{ padding: !isHymn && translations.length > 1 ? '14px 20px 14px' : '20px 20px 14px' }}>
        <p style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 17, lineHeight: 1.8,
          color: 'var(--navy-ink)', fontStyle: 'italic',
          margin: 0, whiteSpace: 'pre-line',
        }}>
          "{displayVerse.content}"
        </p>
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 14px 14px',
        borderTop: '1px solid rgba(14,31,61,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {creed.title}
          </div>
          {isHymn && creed.author && (
            <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 1 }}>{creed.author}</div>
          )}
        </div>

        {/* Verse nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          {verseTotal > 1 && (
            <button onClick={onPrevVerse} style={{
              width: 22, height: 22, borderRadius: '50%', border: '1px solid rgba(14,31,61,0.12)',
              background: 'transparent', cursor: 'pointer', color: 'var(--ink-3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
            }}>
              <ChevronLeft size={12} />
            </button>
          )}
          <span style={{
            padding: '2px 9px', borderRadius: 999, fontSize: 10, fontWeight: 700,
            letterSpacing: '0.05em', whiteSpace: 'nowrap',
            background: isHymn ? 'rgba(26,51,92,0.07)' : 'rgba(63,110,88,0.08)',
            color: isHymn ? '#1A335C' : '#3F6E58',
          }}>
            {isHymn
              ? `${versePosition}/${verseTotal}`
              : (displayVerse.verse_label ? `v${displayVerse.verse_label}` : `${versePosition}/${verseTotal}`)}
          </span>
          {verseTotal > 1 && (
            <button onClick={onNextVerse} style={{
              width: 22, height: 22, borderRadius: '50%', border: '1px solid rgba(14,31,61,0.12)',
              background: 'transparent', cursor: 'pointer', color: 'var(--ink-3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
            }}>
              <ChevronRight size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Next-creed bar — last verse only */}
      {isLastVerse && (
        <button
          onClick={onNextCreed}
          style={{
            ...navBarBase,
            background: 'rgba(26,51,92,0.92)',
            color: '#fff',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#1A335C'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(26,51,92,0.92)'}
        >
          <SkipForward size={12} />
          Next creed
        </button>
      )}
    </div>
  )
}

// ─── Main floating component ──────────────────────────────────────────────────

export default function CreedsBanner() {
  const supabase = createClient()
  const {
    creeds, loaded, setCreeds,
    creedIdx, verseIdx, phase, breakLeft, translationMap, timerKey,
    setVerseIdx, setPhase, setBreakLeft, tickBreak,
    setTranslation, advanceToNextCreed, advanceToPrevCreed, bumpTimer,
  } = useCreedStore()

  const [isHovered, setIsHovered] = useState(false)
  const isHoveredRef = useRef(false)
  const enteringRef  = useRef(true)

  const chunks       = buildChunks(creeds)
  const currentChunk = chunks[creedIdx] ?? []
  const currentSlide = currentChunk[verseIdx]
  const isFirstVerse = verseIdx === 0
  const isLastVerse  = verseIdx === currentChunk.length - 1

  const selectedTranslation = currentSlide
    ? (translationMap[currentSlide.creed.id] ?? getDefaultTranslation(currentSlide.creed))
    : null

  // ── Fetch creeds once ────────────────────────────────────────────────────────
  useEffect(() => {
    if (loaded) return
    supabase
      .from('creeds')
      .select('*, verses:creed_verses(*)')
      .eq('active', true)
      .order('order_index', { ascending: true })
      .then(({ data }) => {
        if (!data?.length) return
        const sorted = (data as Creed[]).map(c => ({
          ...c,
          verses: [...(c.verses ?? [])].sort((a, b) => a.verse_index - b.verse_index),
        }))
        setCreeds(sorted)
        setPhase('showing')
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded])

  // ── Auto-advance verse — pauses on hover, restarts on timerKey change ───────
  useEffect(() => {
    if (phase !== 'showing' || !currentChunk.length) return
    const t = setTimeout(() => {
      if (isHoveredRef.current) return  // swallowed — hover paused it
      if (verseIdx < currentChunk.length - 1) {
        setVerseIdx(verseIdx + 1)
      } else {
        setPhase('waiting')
        setBreakLeft(BREAK_MS)
      }
    }, VERSE_MS)
    return () => clearTimeout(t)
  // timerKey is intentionally included so translation changes restart the clock
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, verseIdx, currentChunk.length, timerKey])

  // ── Break countdown ────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'waiting') return
    if (breakLeft <= 0) { advanceToNextCreed(chunks.length); return }
    const t = setTimeout(tickBreak, 1000)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, breakLeft, chunks.length])

  // ── Enter animation on creed change ───────────────────────────────────────
  useEffect(() => {
    enteringRef.current = true
    const t = setTimeout(() => { enteringRef.current = false }, 50)
    return () => clearTimeout(t)
  }, [creedIdx, phase])

  function handleSelectTranslation(t: string) {
    setTranslation(currentSlide!.creed.id, t)
    bumpTimer()   // restart the 10s clock
  }

  function handleHoverEnter() {
    isHoveredRef.current = true
    setIsHovered(true)
  }

  function handleHoverLeave() {
    isHoveredRef.current = false
    setIsHovered(false)
    bumpTimer()   // restart the 10s clock from the moment hover ends
  }

  if (!loaded || creeds.length === 0 || phase === 'dismissed' || !currentSlide) return null

  return (
    <div
      style={{
        position: 'fixed', bottom: 28, right: 28, zIndex: 30,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{ pointerEvents: 'auto' }}
        onMouseEnter={handleHoverEnter}
        onMouseLeave={handleHoverLeave}
      >
        {phase === 'waiting' ? (
          <MinimizedPill
            breakLeft={breakLeft}
            onSkip={() => advanceToNextCreed(chunks.length)}
          />
        ) : (
          <CreedCard
            slide={currentSlide}
            selectedTranslation={selectedTranslation}
            isHovered={isHovered}
            onSelectTranslation={handleSelectTranslation}
            onPrevVerse={() => { if (verseIdx > 0) setVerseIdx(verseIdx - 1) }}
            onNextVerse={() => {
              if (verseIdx < currentChunk.length - 1) setVerseIdx(verseIdx + 1)
              else { setPhase('waiting'); setBreakLeft(BREAK_MS) }
            }}
            onNextCreed={() => advanceToNextCreed(chunks.length)}
            onPrevCreed={() => advanceToPrevCreed(chunks.length)}
            onDismiss={() => setPhase('dismissed')}
            entering={enteringRef.current}
            isFirstVerse={isFirstVerse}
            isLastVerse={isLastVerse}
          />
        )}
      </div>
    </div>
  )
}
