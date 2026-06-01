'use client'
import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Plus, Search, X, Download, Trash2, FileText, FileImage, 
  FileCode, Film, FileAudio, FileSpreadsheet, FileArchive, File, Upload, AlertTriangle
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface DocumentRecord {
  id: string
  title: string
  description: string | null
  file_path: string
  file_size: number
  mime_type: string
  uploaded_by: string
  created_at: string
  author?: {
    full_name: string
    email: string
  }
}

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

export default function DocumentsClient({
  initialDocuments,
  currentUserId,
  currentUserRole,
  projectId,
}: {
  initialDocuments: DocumentRecord[]
  currentUserId: string
  currentUserRole: 'admin' | 'stakeholder'
  projectId: string
}) {
  const supabase = createClient()
  const [documents, setDocuments] = useState<DocumentRecord[]>(initialDocuments)
  const [search, setSearch] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingDoc, setDeletingDoc] = useState<DocumentRecord | null>(null)
  
  // Upload form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const isAdmin = currentUserRole === 'admin'

  // Filtered documents
  const filtered = useMemo(() => {
    return documents.filter(doc => {
      const q = search.toLowerCase()
      return (
        doc.title.toLowerCase().includes(q) ||
        (doc.description && doc.description.toLowerCase().includes(q)) ||
        (doc.author?.full_name && doc.author.full_name.toLowerCase().includes(q))
      )
    })
  }, [documents, search])

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      setSelectedFile(file)
      if (!title) {
        // Auto fill title with file base name (minus extension)
        const namePart = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
        setTitle(namePart)
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSelectedFile(file)
      if (!title) {
        const namePart = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
        setTitle(namePart)
      }
    }
  }

  // Upload file & record database metadata
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile || !title.trim()) return
    setUploading(true)

    try {
      // 1. Upload file binary to private storage bucket 'project-documents'
      const timestamp = Date.now()
      const sanitizedName = selectedFile.name.replace(/[^a-zA-Z0-9.]/g, '_')
      const filePath = `${projectId}/${timestamp}-${sanitizedName}`
      
      const { data: storageData, error: storageError } = await supabase
        .storage
        .from('project-documents')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (storageError) throw storageError

      // 2. Insert metadata record in PostgreSQL 'documents' table
      const { data: dbData, error: dbError } = await supabase
        .from('documents')
        .insert({
          project_id: projectId,
          title: title.trim(),
          description: description.trim() || null,
          file_path: filePath,
          file_size: selectedFile.size,
          mime_type: selectedFile.type,
          uploaded_by: currentUserId
        })
        .select('*, author:profiles(full_name, email)')
        .single()

      if (dbError) {
        // Cleanup storage file if db insertion failed
        await supabase.storage.from('project-documents').remove([filePath])
        throw dbError
      }

      // Add to local state list
      if (dbData) {
        setDocuments(prev => [dbData, ...prev])
      }

      // Reset state and close modal
      setTitle('')
      setDescription('')
      setSelectedFile(null)
      setShowUploadModal(false)
    } catch (err: any) {
      alert("Upload failed: " + (err.message || err))
    } finally {
      setUploading(false)
    }
  }

  // Request secure temporary signed URL to download
  const handleDownload = async (doc: DocumentRecord) => {
    try {
      const { data, error } = await supabase
        .storage
        .from('project-documents')
        .createSignedUrl(doc.file_path, 60) // valid for 60 seconds

      if (error) throw error
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank')
      }
    } catch (err: any) {
      alert("Failed to retrieve document: " + (err.message || err))
    }
  }

  const handleDelete = async (doc: DocumentRecord) => {
    setDeletingId(doc.id)

    try {
      // 1. Delete from Supabase Storage
      const { error: storageError } = await supabase
        .storage
        .from('project-documents')
        .remove([doc.file_path])

      if (storageError) throw storageError

      // 2. Delete Postgres database record
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id)

      if (dbError) throw dbError

      // Update local state list
      setDocuments(prev => prev.filter(item => item.id !== doc.id))
    } catch (err: any) {
      alert("Delete failed: " + (err.message || err))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Project Repository</div>
          <h1 className="page-title">Documents</h1>
          <p className="page-subtitle">Central file storage and assets — visible to all project members</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
            <Plus size={15} /> Upload Document
          </button>
        )}
      </div>

      <div className="page-body">
        {/* Search bar */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="input"
              placeholder="Search documents by name, keyword or uploader…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 32 }}
            />
          </div>
        </div>

        {/* Documents Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>Type</th>
                <th>Document</th>
                <th style={{ width: 100 }}>Size</th>
                <th style={{ width: 130 }}>Uploaded By</th>
                <th style={{ width: 110 }}>Upload Date</th>
                <th style={{ width: 110, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                    No documents found
                  </td>
                </tr>
              ) : (
                filtered.map(doc => (
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
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2, maxWidth: 450 }}>
                          {doc.description}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {formatBytes(doc.file_size)}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {doc.author?.full_name ?? 'Uploader'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {formatDate(doc.created_at)}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => handleDownload(doc)}
                          title="Download document"
                        >
                          <Download size={14} />
                        </button>
                        {isAdmin && (
                          <button
                            className="btn btn-danger btn-icon btn-sm"
                            onClick={() => setDeletingDoc(doc)}
                            disabled={deletingId === doc.id}
                            title="Delete document"
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
      </div>

      {/* Upload Document Modal (Admin only) */}
      {showUploadModal && isAdmin && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !uploading && setShowUploadModal(false)}>
          <div className="modal fade-in" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2 className="modal-title">Upload Document</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => !uploading && setShowUploadModal(false)} disabled={uploading}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Drag & drop upload area */}
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                style={{
                  border: `2px dashed ${dragActive ? '#C9A84C' : 'rgba(14, 31, 61, 0.12)'}`,
                  background: dragActive ? 'rgba(201, 168, 76, 0.05)' : 'rgba(14, 31, 61, 0.02)',
                  borderRadius: 12,
                  padding: '30px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  position: 'relative'
                }}
              >
                <input 
                  type="file" 
                  id="file-upload" 
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  required={!selectedFile}
                />
                
                <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Upload size={28} style={{ color: '#C9A84C', marginBottom: 8 }} />
                  
                  {selectedFile ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy-ink)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedFile.name}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {formatBytes(selectedFile.size)} · Click to change file
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--navy-ink)', display: 'block' }}>
                        Drag & drop file here
                      </span>
                      <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                        or click to browse from device
                      </span>
                    </div>
                  )}
                </label>
              </div>

              {/* Title */}
              <div className="form-group">
                <label className="label">Document Name *</label>
                <input 
                  className="input" 
                  placeholder="e.g. Architectural Renderings"
                  value={title} 
                  onChange={e => setTitle(e.target.value)}
                  required
                  disabled={uploading}
                />
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="label">Description (Optional)</label>
                <textarea 
                  className="input" 
                  placeholder="Provide some details about the file, revision history, or instructions…"
                  value={description} 
                  onChange={e => setDescription(e.target.value)}
                  style={{ minHeight: 60 }}
                  disabled={uploading}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                <button 
                  type="button" 
                  className="btn btn-ghost" 
                  onClick={() => setShowUploadModal(false)}
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={uploading || !selectedFile || !title.trim()}
                >
                  {uploading ? 'Uploading...' : 'Upload File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingDoc && (
        <div className="modal-overlay" onClick={() => setDeletingDoc(null)}>
          <div className="modal fade-in" style={{ maxWidth: 400, textAlign: 'center', padding: '32px 24px' }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(180, 69, 47, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#B4452F',
              margin: '0 auto 16px',
            }}>
              <Trash2 size={28} />
            </div>
            
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 600, color: 'var(--navy-ink)', marginBottom: 8 }}>
              Delete Document?
            </h2>
            
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 24 }}>
              Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{deletingDoc.title}</strong>? This will permanently remove the document record and its file.
            </p>
            
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button 
                className="btn btn-ghost" 
                onClick={() => setDeletingDoc(null)}
                style={{ minWidth: 100 }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                onClick={async () => {
                  const doc = deletingDoc
                  setDeletingDoc(null)
                  await handleDelete(doc)
                }}
                style={{ minWidth: 120 }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
