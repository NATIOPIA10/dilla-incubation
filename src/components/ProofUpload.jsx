import { useEffect, useRef, useState } from 'react'

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB, same as the storage bucket limit
const TYPES = ['application/pdf', 'image/jpeg', 'image/png']

const formatSize = (bytes) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`

export default function ProofUpload({ file, onChange, required, hasExisting, onViewExisting }) {
  const input = useRef(null)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)

  const isPdf = file?.type === 'application/pdf'

  // Thumbnail for image files
  useEffect(() => {
    if (!file || isPdf) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file, isPdf])

  function accept(f) {
    setError('')
    if (!f) return
    if (!TYPES.includes(f.type)) return setError('Please choose a PDF, JPG, or PNG file.')
    if (f.size > MAX_SIZE) return setError(`That file is ${formatSize(f.size)}. The limit is 10 MB.`)
    onChange(f)
  }

  function remove() {
    setError('')
    onChange(null)
    if (input.current) input.current.value = ''
  }

  const picked = (e) => {
    accept(e.target.files[0])
    e.target.value = ''
  }

  return (
    <div className="mb-4">
      <label className="mb-1 block text-sm text-gray-600">
        Proof document {required ? '(required)' : '(optional)'}
      </label>

      <input ref={input} type="file" accept=".pdf,image/jpeg,image/png" onChange={picked} className="hidden" />

      {/* Document already on file (when editing a record) */}
      {hasExisting && !file && (
        <div className="mb-2 flex items-center justify-between gap-3 rounded border border-du-green bg-green-50 px-3 py-2 text-sm">
          <span className="font-semibold text-du-green-dark">✔ A document is already uploaded</span>
          <button type="button" onClick={onViewExisting} className="text-du-blue underline">
            View current
          </button>
        </div>
      )}

      {!file ? (
        <button
          type="button"
          onClick={() => input.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            accept(e.dataTransfer.files[0])
          }}
          className={`w-full rounded-lg border-2 border-dashed px-4 py-7 text-center transition ${
            dragging ? 'border-du-green bg-green-50' : 'border-gray-300 bg-blue-50 hover:border-du-green'
          }`}
        >
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-du-green/10 text-2xl">
            📄
          </div>
          <p className="font-semibold text-du-green-dark">
            {hasExisting ? 'Click to upload a new document' : 'Click to upload, or drag and drop'}
          </p>
          <p className="mt-1 text-xs text-gray-500">PDF, JPG, or PNG · up to 10 MB</p>
        </button>
      ) : (
        <div className="rounded-lg border border-gray-300 bg-white p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded border border-gray-200 bg-gray-100">
              {isPdf ? (
                <span className="rounded bg-du-red px-2 py-1 text-xs font-bold text-white">PDF</span>
              ) : (
                preview && <img src={preview} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-du-green-dark">✔ {file.name}</p>
              <p className="text-xs text-gray-500">{formatSize(file.size)}</p>
              {hasExisting && (
                <p className="text-xs text-gray-500">This will replace the current document.</p>
              )}
            </div>
          </div>
          <div className="mt-3 flex gap-2 text-sm">
            <button
              type="button"
              onClick={() => input.current.click()}
              className="rounded border border-du-green-dark px-3 py-1 text-du-green-dark hover:bg-green-50"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={remove}
              className="rounded border border-du-red px-3 py-1 text-du-red hover:bg-red-50"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-du-red">{error}</p>}

      <ul className="mt-3 space-y-1 text-xs text-gray-500">
        <li>• Upload the certificate or the official registration papers.</li>
        <li>• Make sure the title, number, and issuing authority can be read.</li>
        <li>• The admin will check this document before verifying your record.</li>
      </ul>
    </div>
  )
}