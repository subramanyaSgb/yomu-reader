import { useState } from 'react'
import { ArrowLeft, FileArchive, FileText, FolderOpen, Trash2 } from 'lucide-react'
import { readCbz, readImageFolder, readPdf, detectKind } from './localFiles'
import ZoomableImage from '../reader/zoom/ZoomableImage'

interface LocalFile {
  id: string; name: string; kind: 'cbz' | 'pdf' | 'folder'; pages: number; sizeMb: number; resumePage: number
}

export default function LocalFilesScreen({ onBack }: { onBack?: () => void }) {
  const [pages, setPages] = useState<string[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [importStage, setImportStage] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [files] = useState<LocalFile[]>([]) // loaded from db in prod

  async function onPick(picked: FileList | null, kind?: 'cbz' | 'pdf' | 'folder') {
    if (!picked || picked.length === 0) return
    setBusy(true)
    setImportStage('Reading file')
    try {
      const arr = Array.from(picked)
      if (arr.length > 1 || kind === 'folder') {
        setName(`${arr.length} images`)
        setImportStage('Sorting pages')
        setPages(readImageFolder(arr))
      } else {
        const f = arr[0]
        setName(f.name)
        const detectedKind = detectKind(f)
        if (detectedKind === 'cbz') { setImportStage('Reading entries'); setPages(await readCbz(f)) }
        else if (detectedKind === 'pdf') { setImportStage('Rendering pages'); setPages(await readPdf(f)) }
        else if (detectedKind === 'image') { setImportStage('Sorting pages'); setPages(readImageFolder(arr)) }
        else setPages([])
      }
    } finally {
      setBusy(false)
      setImportStage(null)
    }
  }

  if (pages) {
    return (
      <div style={{ height: '100%', overflowY: 'auto', background: 'var(--y-black)' }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--y-ov)' }}>
          <button onClick={() => setPages(null)} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.1)', borderRadius: 12, border: 'none', cursor: 'pointer', color: '#fff' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{name}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Local file · {pages.length} pages</div>
          </div>
        </div>
        {pages.map((src, i) => <ZoomableImage key={i} src={src} />)}
        {pages.length === 0 && <p style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Unsupported or empty file.</p>}
      </div>
    )
  }

  const KIND_ICON = { cbz: FileArchive, pdf: FileText, folder: FolderOpen }
  const KIND_LABEL = { cbz: 'CBZ', pdf: 'PDF', folder: 'FOLDER' }

  return (
    <div style={{ background: 'var(--y-bg)', minHeight: '100%', paddingBottom: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, padding: '12px 14px 0' }}>
        {onBack && (
          <button onClick={onBack} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--y-hi)', flexShrink: 0, marginTop: 2 }}>
            <ArrowLeft size={20} />
          </button>
        )}
        <div>
          <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--y-hi)', lineHeight: 1.1 }}>Local files</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--y-dim)', marginTop: 2 }}>{files.length} imported · stays on this device, never uploaded</div>
        </div>
      </div>

      {/* Import tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, padding: '18px 18px 6px' }}>
        {([
          { label: 'CBZ / CBR', sub: 'Comic archive', icon: FileArchive, kind: 'cbz' as const, accept: '.cbz,.zip,.cbr', multiple: false },
          { label: 'PDF', sub: 'Scanned book', icon: FileText, kind: 'pdf' as const, accept: '.pdf', multiple: false },
          { label: 'Folder', sub: 'Loose images', icon: FolderOpen, kind: 'folder' as const, accept: 'image/*', multiple: true },
        ]).map(tile => {
          const Icon = tile.icon
          return (
            <label key={tile.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 90, borderRadius: 14, border: '1.5px dashed var(--y-line)', background: 'var(--y-surf)', cursor: 'pointer', padding: '12px 6px', textAlign: 'center' }}>
              <Icon size={21} style={{ color: 'var(--y-plt)' }} />
              <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--y-hi)', lineHeight: 1.2 }}>{tile.label}</div>
              <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--y-dim)' }}>{tile.sub}</div>
              <input type="file" multiple={tile.multiple} accept={tile.accept} style={{ display: 'none' }} onChange={e => onPick(e.target.files, tile.kind)} />
            </label>
          )
        })}
      </div>

      {/* Import progress */}
      {busy && importStage && (
        <div style={{ margin: '12px 18px', background: 'var(--y-surf)', border: '1px solid var(--y-line)', borderRadius: 14, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--y-hi)' }}>{name}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--y-plt)' }}>{importStage}</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--y-line)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '60%', background: 'var(--y-p)', borderRadius: 3, animation: 'pulse 1.2s ease infinite' }} />
          </div>
          <p style={{ fontSize: 10, fontWeight: 500, color: 'var(--y-dim)', marginTop: 8, lineHeight: 1.55 }}>Nothing leaves the device.</p>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div style={{ padding: '12px 18px 0' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--y-dim)', marginBottom: 12 }}>On this device</div>
          {files.map(f => {
            const Icon = KIND_ICON[f.kind]
            return (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid var(--y-line2)' }}>
                <div style={{ width: 48, height: 66, borderRadius: 10, background: 'var(--y-surf)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} style={{ color: 'var(--y-plt)' }} />
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--y-hi)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                    <span style={{ background: 'var(--y-ok)', color: 'var(--y-onp)', fontSize: 8.5, fontWeight: 800, borderRadius: 5, padding: '2px 5px', flexShrink: 0, textTransform: 'uppercase' }}>{KIND_LABEL[f.kind]}</span>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--y-mid)' }}>{f.pages} pages · {f.sizeMb.toFixed(1)} MB</div>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--y-dim)', marginTop: 1 }}>
                    {f.resumePage > 0 ? `Resume page ${f.resumePage}` : 'Not started'}
                  </div>
                </div>
                <button style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--y-a)', flexShrink: 0 }}>
                  <Trash2 size={18} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <p style={{ padding: '16px 18px 0', fontSize: 10.5, fontWeight: 500, color: 'var(--y-dim)', lineHeight: 1.55 }}>
        Local series read in the same readers, with their own progress and reading-mode memory. They are excluded from sync and from MangaDex update checks.
      </p>
    </div>
  )
}
