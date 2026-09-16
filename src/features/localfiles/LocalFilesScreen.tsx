// Local files (FR-5): pick a CBZ / PDF / image folder and read it. Local content is on-device
// only (never synced). Renders pages with the same Zoomable image path as online reading.
import { useState } from 'react'
import { readCbz, readImageFolder, readPdf, detectKind } from './localFiles'
import ZoomableImage from '../reader/zoom/ZoomableImage'

export default function LocalFilesScreen() {
  const [pages, setPages] = useState<string[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState('')

  async function onPick(files: FileList | null) {
    if (!files || files.length === 0) return
    setBusy(true)
    try {
      const arr = Array.from(files)
      if (arr.length > 1) {
        setName(`${arr.length} images`)
        setPages(readImageFolder(arr))
      } else {
        const f = arr[0]
        setName(f.name)
        const kind = detectKind(f)
        if (kind === 'cbz') setPages(await readCbz(f))
        else if (kind === 'pdf') setPages(await readPdf(f))
        else if (kind === 'image') setPages(readImageFolder(arr))
        else setPages([])
      }
    } finally {
      setBusy(false)
    }
  }

  if (pages) {
    return (
      <div className="h-full overflow-y-auto bg-black">
        <button
          onClick={() => setPages(null)}
          className="sticky top-0 z-10 m-2 rounded-full bg-black/60 px-3 py-1 text-sm text-white"
        >
          ← {name}
        </button>
        {pages.map((src, i) => (
          <ZoomableImage key={i} src={src} />
        ))}
        {pages.length === 0 && (
          <p className="p-8 text-center text-neutral-500">Unsupported or empty file.</p>
        )}
      </div>
    )
  }

  return (
    <div className="px-4 pb-20 pt-4">
      <h1 className="mb-4 text-2xl font-bold text-white">Local files</h1>
      <p className="mb-3 text-sm text-neutral-400">Open a CBZ, PDF, or image files.</p>
      <label className="inline-block cursor-pointer rounded-lg bg-violet-600 px-4 py-2 text-white">
        {busy ? 'Reading…' : 'Choose file(s)'}
        <input
          type="file"
          multiple
          accept=".cbz,.zip,.pdf,image/*"
          className="hidden"
          onChange={(e) => onPick(e.target.files)}
        />
      </label>
    </div>
  )
}
