'use client'
import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Plus, Search, X, Download, Trash2, FileText, FileImage,
  FileCode, Film, FileAudio, FileSpreadsheet, FileArchive, File, Upload,
  FolderOpen, Folder, Settings2, ChevronRight, Tag
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import DeleteConfirmModal from '@/components/DeleteConfirmModal'

// ─── Types ─────────────────────────────────────────────────────

export interface Category {
  id: string
  name: string
  description: string | null
  order_index: number
  created_at: string
}

interface DocumentRecord {
  id: string
  title: string
  description: string | null
  file_path: string
  file_size: number
  mime_type: string
  uploaded_by: string
  created_at: string
  category_id: string | null
  category?: { id: string; name: string } | null
  author?: { full_name: string; email: string }
}

// ─── Helpers ────────────────────────────────────────────────────

function formatBytes(bytes?: number) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  const k = 1024
  const sizes = ['KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function getFileIcon(mimeType?: string) {
  if (!mimeType) return <File size={16} />
  const type = mimeType.toLowerCase()
  if (type.startsWith('image/')) return <FileImage size={16} style={{ color: '#C9A84C' }} />
  if (type.startsWith('video/')) return <Film size={16} style={{ color: '#1A335C' }} />
  if (type.startsWith('audio/')) return <FileAudio size={16} style={{ color: '#1A335C' }} />
  if (type.includes('pdf') || type.includes('word') || type.includes('text') || type.includes('document')) {
    return <FileText size={16} style={{ color: '#8B7426' }} />
  }
  if (type.includes('sheet') || type.includes('excel') || type.includes('csv') || type.includes('spreadsheet')) {
    return <FileSpreadsheet size={16} style={{ color: '#3F6E58' }} />
  }
  if (type.includes('zip') || type.includes('tar') || type.includes('rar') || type.includes('compressed')) {
    return <FileArchive size={16} style={{ color: '#6C7791' }} />
  }
  return <File size={16} />
}

// ─── Manage Categories Modal ─────────────────────────────────────

function ManageCategoriesModal({
  categories,
  onClose,
  onAdd,
  onDelete,
}: {
  categories: Category[]
  onClose: () => void
  onAdd: (name: string, description: string) => Promise<void>
  onDelete: (cat: Category) => Promise<void>
}) {
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmCat, setConfirmCat] = useState<Category | null>(null)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setAdding(true)
    try {
      await onAdd(newName.trim(), newDesc.trim())
      setNewName('')
      setNewDesc('')
    } finally {
      setAdding(false)
    }
  }

  return (
    <>
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal fade-in" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h2 className="modal-title">Manage Categories</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Existing categories list */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
            Existing categories ({categories.length})
          </div>
          {categories.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, background: 'var(--cream-2)', borderRadius: 'var(--r-lg)' }}>
              No categories yet — add one below.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {categories.map(cat => (
                <div key={cat.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', background: 'var(--cream-2)',
                  borderRadius: 'var(--r-md)', border: '1px solid var(--line)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 'var(--r-sm)', background: 'var(--gold-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Folder size={14} style={{ color: 'var(--gold-deep)' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--navy-ink)' }}>{cat.name}</div>
                      {cat.description && (
                        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 1 }}>{cat.description}</div>
                      )}
                    </div>
                  </div>
                  <button
                    className="btn btn-danger btn-icon btn-sm"
                    title="Delete category"
                    disabled={deletingId === cat.id}
                    onClick={() => setConfirmCat(cat)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add new category */}
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
            Add New Category
          </div>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label">Category Name *</label>
              <input
                className="input"
                placeholder="e.g. Design Assets, Legal, Reports…"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                disabled={adding}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label">Description (optional)</label>
              <input
                className="input"
                placeholder="Short description of what belongs here"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                disabled={adding}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={adding}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={adding || !newName.trim()}>
                <Plus size={14} />
                {adding ? 'Adding…' : 'Add Category'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    {confirmCat && (
      <DeleteConfirmModal
        title="Delete Category?"
        message={<>Are you sure you want to delete <strong>{confirmCat.name}</strong>? Any documents in this category will be moved to Uncategorised.</>}
        onConfirm={async () => {
          const cat = confirmCat
          setConfirmCat(null)
          setDeletingId(cat.id)
          try { await onDelete(cat) } finally { setDeletingId(null) }
        }}
        onCancel={() => setConfirmCat(null)}
      />
    )}
    </>
  )
}

// ─── Main Component ──────────────────────────────────────────────

export default function DocumentsClient({
  initialDocuments,
  initialCategories,
  currentUserId,
  currentUserRole,
  projectId,
}: {
  initialDocuments: DocumentRecord[]
  initialCategories: Category[]
  currentUserId: string
  currentUserRole: 'admin' | 'stakeholder'
  projectId: string
}) {
  const supabase = createClient()
  const [documents, setDocuments] = useState<DocumentRecord[]>(initialDocuments)
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [activeCatId, setActiveCatId] = useState<string | 'all' | 'uncategorised'>('all')
  const [search, setSearch] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showCatModal, setShowCatModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingDoc, setDeletingDoc] = useState<DocumentRecord | null>(null)

  // Upload form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedCatId, setSelectedCatId] = useState<string>('')
  const [dragActive, setDragActive] = useState(false)

  const isAdmin = currentUserRole === 'admin'

  // ── Filtering ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return documents.filter(doc => {
      // Category filter
      if (activeCatId === 'uncategorised' && doc.category_id !== null) return false
      if (activeCatId !== 'all' && activeCatId !== 'uncategorised' && doc.category_id !== activeCatId) return false
      // Search filter
      const q = search.toLowerCase()
      return (
        doc.title.toLowerCase().includes(q) ||
        (doc.description && doc.description.toLowerCase().includes(q)) ||
        (doc.author?.full_name && doc.author.full_name.toLowerCase().includes(q))
      )
    })
  }, [documents, activeCatId, search])

  // Docs grouped by category (for the "All" view)
  const grouped = useMemo(() => {
    if (activeCatId !== 'all' || search) return null
    const map = new Map<string | null, DocumentRecord[]>()
    categories.forEach(cat => map.set(cat.id, []))
    map.set(null, []) // uncategorised bucket
    documents.forEach(doc => {
      const key = doc.category_id ?? null
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(doc)
    })
    return map
  }, [documents, categories, activeCatId, search])

  // ── Drag & Drop ────────────────────────────────────────────────
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files?.[0]) {
      const file = e.dataTransfer.files[0]
      setSelectedFile(file)
      if (!title) setTitle(file.name.substring(0, file.name.lastIndexOf('.')) || file.name)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0]
      setSelectedFile(file)
      if (!title) setTitle(file.name.substring(0, file.name.lastIndexOf('.')) || file.name)
    }
  }

  // ── Upload ─────────────────────────────────────────────────────
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile || !title.trim()) return
    setUploading(true)
    try {
      const timestamp = Date.now()
      const sanitizedName = selectedFile.name.replace(/[^a-zA-Z0-9.]/g, '_')
      const filePath = `${projectId}/${timestamp}-${sanitizedName}`

      const { error: storageError } = await supabase.storage
        .from('project-documents')
        .upload(filePath, selectedFile, { cacheControl: '3600', upsert: false })
      if (storageError) throw storageError

      const { data: dbData, error: dbError } = await supabase
        .from('documents')
        .insert({
          project_id: projectId,
          title: title.trim(),
          description: description.trim() || null,
          file_path: filePath,
          file_size: selectedFile.size,
          mime_type: selectedFile.type,
          uploaded_by: currentUserId,
          category_id: selectedCatId || null,
        })
        .select('*, author:profiles(full_name, email), category:document_categories(id, name)')
        .single()

      if (dbError) {
        await supabase.storage.from('project-documents').remove([filePath])
        throw dbError
      }
      if (dbData) setDocuments(prev => [dbData, ...prev])

      setTitle(''); setDescription(''); setSelectedFile(null); setSelectedCatId('')
      setShowUploadModal(false)
    } catch (err: any) {
      alert('Upload failed: ' + (err.message || err))
    } finally {
      setUploading(false)
    }
  }

  // ── Download ───────────────────────────────────────────────────
  const handleDownload = async (doc: DocumentRecord) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-documents')
        .createSignedUrl(doc.file_path, 60)
      if (error) throw error
      if (data?.signedUrl) window.open(data.signedUrl, '_blank')
    } catch (err: any) {
      alert('Failed to retrieve document: ' + (err.message || err))
    }
  }

  // ── Delete doc ─────────────────────────────────────────────────
  const handleDelete = async (doc: DocumentRecord) => {
    setDeletingId(doc.id)
    try {
      const { error: storageError } = await supabase.storage.from('project-documents').remove([doc.file_path])
      if (storageError) throw storageError
      const { error: dbError } = await supabase.from('documents').delete().eq('id', doc.id)
      if (dbError) throw dbError
      setDocuments(prev => prev.filter(item => item.id !== doc.id))
    } catch (err: any) {
      alert('Delete failed: ' + (err.message || err))
    } finally {
      setDeletingId(null)
    }
  }

  // ── Category CRUD ──────────────────────────────────────────────
  const handleAddCategory = async (name: string, description: string) => {
    const { data, error } = await supabase
      .from('document_categories')
      .insert({ name, description: description || null, order_index: categories.length })
      .select()
      .single()
    if (error) { alert('Failed to add category: ' + error.message); return }
    if (data) setCategories(prev => [...prev, data])
  }

  const handleDeleteCategory = async (cat: Category) => {
    const { error } = await supabase.from('document_categories').delete().eq('id', cat.id)
    if (error) { alert('Failed to delete category: ' + error.message); return }
    setCategories(prev => prev.filter(c => c.id !== cat.id))
    setDocuments(prev => prev.map(d => d.category_id === cat.id ? { ...d, category_id: null, category: null } : d))
    if (activeCatId === cat.id) setActiveCatId('all')
  }

  // ── Doc table (reusable) ───────────────────────────────────────
  const DocTable = ({ docs }: { docs: DocumentRecord[] }) => (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: 40 }}>Type</th>
            <th>Document</th>
            <th style={{ width: 100 }}>Size</th>
            <th style={{ width: 130 }}>Uploaded By</th>
            <th style={{ width: 110 }}>Date</th>
            <th style={{ width: 110, textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {docs.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                No documents here yet
              </td>
            </tr>
          ) : (
            docs.map(doc => (
              <tr key={doc.id}>
                <td>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {getFileIcon(doc.mime_type)}
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                    {doc.title}
                  </div>
                  {doc.description && (
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2, maxWidth: 420 }}>
                      {doc.description}
                    </div>
                  )}
                </td>
                <td><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatBytes(doc.file_size)}</span></td>
                <td><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{doc.author?.full_name ?? 'Uploader'}</span></td>
                <td><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatDate(doc.created_at)}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDownload(doc)} title="Download">
                      <Download size={14} />
                    </button>
                    {isAdmin && (
                      <button
                        className="btn btn-danger btn-icon btn-sm"
                        onClick={() => setDeletingDoc(doc)}
                        disabled={deletingId === doc.id}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )

  // ── Category pill nav ──────────────────────────────────────────
  const catCounts = useMemo(() => {
    const map: Record<string, number> = { all: documents.length, uncategorised: 0 }
    documents.forEach(d => {
      if (!d.category_id) map.uncategorised = (map.uncategorised || 0) + 1
      else map[d.category_id] = (map[d.category_id] || 0) + 1
    })
    return map
  }, [documents])

  const pillStyle = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 14px',
    borderRadius: 'var(--r-pill)',
    fontSize: 12.5,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s',
    border: 'none',
    background: active ? 'var(--navy-ink)' : 'var(--paper)',
    color: active ? '#fff' : 'var(--ink-2)',
    boxShadow: active ? 'var(--sh-2)' : '0 1px 2px rgba(14,31,61,.06)',
  })

  const countBubble = (n: number, active: boolean) => (
    <span style={{
      fontSize: 10, fontWeight: 700, minWidth: 18, height: 18,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 'var(--r-pill)', padding: '0 5px',
      background: active ? 'rgba(255,255,255,0.18)' : 'rgba(14,31,61,0.08)',
      color: active ? '#fff' : 'var(--ink-3)',
    }}>{n}</span>
  )

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Project Repository</div>
          <h1 className="page-title">Documents</h1>
          <p className="page-subtitle">Central file storage — organised by category, visible to all members</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {isAdmin && (
            <button className="btn btn-ghost" onClick={() => setShowCatModal(true)}>
              <Settings2 size={14} /> Manage Categories
            </button>
          )}
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
              <Plus size={15} /> Upload Document
            </button>
          )}
        </div>
      </div>

      <div className="page-body">
        {/* ── Category pills + search bar ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
          {/* Category pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <button style={pillStyle(activeCatId === 'all')} onClick={() => setActiveCatId('all')}>
              <FolderOpen size={13} /> All {countBubble(catCounts.all, activeCatId === 'all')}
            </button>
            {categories.map(cat => (
              <button key={cat.id} style={pillStyle(activeCatId === cat.id)} onClick={() => setActiveCatId(cat.id)}>
                <Folder size={13} /> {cat.name} {countBubble(catCounts[cat.id] ?? 0, activeCatId === cat.id)}
              </button>
            ))}
            {catCounts.uncategorised > 0 && (
              <button style={pillStyle(activeCatId === 'uncategorised')} onClick={() => setActiveCatId('uncategorised')}>
                <Tag size={13} /> Uncategorised {countBubble(catCounts.uncategorised, activeCatId === 'uncategorised')}
              </button>
            )}
          </div>

          {/* Search */}
          <div style={{ position: 'relative', minWidth: 220, flex: '0 1 300px' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="input"
              placeholder="Search documents…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 32 }}
            />
          </div>
        </div>

        {/* ── Content ── */}
        {grouped && !search ? (
          /* Grouped "All" view */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {categories.map(cat => {
              const docs = grouped.get(cat.id) ?? []
              if (docs.length === 0) return null
              return (
                <div key={cat.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 'var(--r-sm)', background: 'var(--gold-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FolderOpen size={13} style={{ color: 'var(--gold-deep)' }} />
                    </div>
                    <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 600, color: 'var(--navy-ink)', margin: 0 }}>
                      {cat.name}
                    </h3>
                    <span style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600 }}>{docs.length} file{docs.length !== 1 ? 's' : ''}</span>
                    {cat.description && (
                      <>
                        <ChevronRight size={12} style={{ color: 'var(--ink-3)' }} />
                        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{cat.description}</span>
                      </>
                    )}
                  </div>
                  <DocTable docs={docs} />
                </div>
              )
            })}

            {/* Uncategorised */}
            {(grouped.get(null) ?? []).length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 'var(--r-sm)', background: 'var(--cream-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Tag size={13} style={{ color: 'var(--ink-3)' }} />
                  </div>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 600, color: 'var(--ink-2)', margin: 0 }}>
                    Uncategorised
                  </h3>
                  <span style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600 }}>{(grouped.get(null) ?? []).length} file{(grouped.get(null) ?? []).length !== 1 ? 's' : ''}</span>
                </div>
                <DocTable docs={grouped.get(null) ?? []} />
              </div>
            )}

            {documents.length === 0 && (
              <div className="empty-state">
                <FolderOpen size={40} />
                <h3>No documents yet</h3>
                <p style={{ fontSize: 13 }}>
                  {isAdmin ? 'Upload the first document using the button above.' : 'Documents shared with you will appear here.'}
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Filtered / search view — flat table */
          <DocTable docs={filtered} />
        )}
      </div>

      {/* ── Upload Modal ── */}
      {showUploadModal && isAdmin && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !uploading && setShowUploadModal(false)}>
          <div className="modal fade-in" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h2 className="modal-title">Upload Document</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => !uploading && setShowUploadModal(false)} disabled={uploading}><X size={16} /></button>
            </div>

            <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Drop zone */}
              <div
                onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
                style={{
                  border: `2px dashed ${dragActive ? '#C9A84C' : 'rgba(14,31,61,0.12)'}`,
                  background: dragActive ? 'rgba(201,168,76,0.05)' : 'rgba(14,31,61,0.02)',
                  borderRadius: 12, padding: '28px 20px', textAlign: 'center',
                  cursor: 'pointer', transition: 'all 0.15s', position: 'relative'
                }}
              >
                <input type="file" id="file-upload" onChange={handleFileChange} style={{ display: 'none' }} required={!selectedFile} />
                <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Upload size={28} style={{ color: '#C9A84C', marginBottom: 8 }} />
                  {selectedFile ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy-ink)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedFile.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatBytes(selectedFile.size)} · Click to change</span>
                    </div>
                  ) : (
                    <div>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--navy-ink)', display: 'block' }}>Drag & drop file here</span>
                      <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>or click to browse from device</span>
                    </div>
                  )}
                </label>
              </div>

              {/* Title */}
              <div className="form-group">
                <label className="label">Document Name *</label>
                <input className="input" placeholder="e.g. Architectural Renderings" value={title} onChange={e => setTitle(e.target.value)} required disabled={uploading} />
              </div>

              {/* Category */}
              <div className="form-group">
                <label className="label">Category</label>
                <select className="input" value={selectedCatId} onChange={e => setSelectedCatId(e.target.value)} disabled={uploading}>
                  <option value="">— Uncategorised —</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                {categories.length === 0 && isAdmin && (
                  <span style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 4, display: 'block' }}>
                    No categories yet — <button type="button" style={{ background: 'none', border: 'none', padding: 0, color: 'var(--gold-deep)', fontWeight: 600, cursor: 'pointer', fontSize: 'inherit' }} onClick={() => { setShowUploadModal(false); setShowCatModal(true) }}>create one first</button>.
                  </span>
                )}
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="label">Description (Optional)</label>
                <textarea className="input" placeholder="Provide details, revision history, or instructions…" value={description} onChange={e => setDescription(e.target.value)} style={{ minHeight: 60 }} disabled={uploading} />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowUploadModal(false)} disabled={uploading}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={uploading || !selectedFile || !title.trim()}>
                  {uploading ? 'Uploading…' : 'Upload File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Manage Categories Modal ── */}
      {showCatModal && isAdmin && (
        <ManageCategoriesModal
          categories={categories}
          onClose={() => setShowCatModal(false)}
          onAdd={handleAddCategory}
          onDelete={handleDeleteCategory}
        />
      )}

      {/* ── Delete Doc Confirm ── */}
      {deletingDoc && (
        <DeleteConfirmModal
          title="Delete Document?"
          message={<>Are you sure you want to delete <strong>{deletingDoc.title}</strong>? This will permanently remove the file and its record.</>}
          onConfirm={async () => { const doc = deletingDoc; setDeletingDoc(null); await handleDelete(doc) }}
          onCancel={() => setDeletingDoc(null)}
        />
      )}
    </div>
  )
}
