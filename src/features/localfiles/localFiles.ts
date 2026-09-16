// Local file reading (FR-5): CBZ (jszip), image folders (natural sort), PDF (pdf.js lazy).
// Returns page objectURLs the reader can render like any chapter. Local content never syncs.

import { naturalSort } from '../../lib/naturalSort'

const IMAGE_RE = /\.(png|jpe?g|webp|gif|avif|bmp)$/i

/** Extract ordered image objectURLs from a CBZ (zip) file. */
export async function readCbz(file: File): Promise<string[]> {
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(file)
  const names = naturalSort(
    Object.keys(zip.files).filter((n) => IMAGE_RE.test(n) && !zip.files[n].dir),
  )
  const urls: string[] = []
  for (const name of names) {
    const blob = await zip.files[name].async('blob')
    urls.push(URL.createObjectURL(blob))
  }
  return urls
}

/** Order + objectURL an array of picked image files (folder selection). */
export function readImageFolder(files: File[]): string[] {
  const images = files.filter((f) => IMAGE_RE.test(f.name))
  const byName = new Map(images.map((f) => [f.name, f]))
  return naturalSort([...byName.keys()]).map((n) => URL.createObjectURL(byName.get(n)!))
}

/** Render a PDF to page objectURLs via pdf.js (lazy-imported so it never bloats startup). */
export async function readPdf(file: File): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist')
  // Worker: use the bundled worker entry.
  const worker = await import('pdfjs-dist/build/pdf.worker.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = (worker as { default: string }).default

  const data = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({ data }).promise
  const urls: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const viewport = page.getViewport({ scale: 2 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!
    await page.render({ canvas, canvasContext: ctx, viewport }).promise
    const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), 'image/webp', 0.9))
    urls.push(URL.createObjectURL(blob))
  }
  return urls
}

export function detectKind(file: File): 'cbz' | 'pdf' | 'image' | 'unknown' {
  const n = file.name.toLowerCase()
  if (n.endsWith('.cbz') || n.endsWith('.zip')) return 'cbz'
  if (n.endsWith('.pdf')) return 'pdf'
  if (IMAGE_RE.test(n)) return 'image'
  return 'unknown'
}
