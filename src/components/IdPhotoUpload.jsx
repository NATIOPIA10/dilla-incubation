import { useEffect, useRef, useState } from 'react'

const MAX_SIZE = 3 * 1024 * 1024 // 3 MB, same as the storage bucket limit
const TYPES = ['image/jpeg', 'image/png', 'image/webp']

export default function IdPhotoUpload({ file, onChange }) {
  const fileInput = useRef(null)
  const cameraInput = useRef(null)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)

  // Build a preview URL and clean it up afterwards
  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function accept(f) {
    setError('')
    if (!f) return
    if (!TYPES.includes(f.type)) {
      return setError('Please choose a JPG, PNG, or WEBP image.')
    }
    if (f.size > MAX_SIZE) {
      return setError(`That photo is ${(f.size / 1024 / 1024).toFixed(1)} MB. The limit is 3 MB.`)
    }
    onChange(f)
  }

  function remove() {
    setError('')
    onChange(null)
    if (fileInput.current) fileInput.current.value = ''
    if (cameraInput.current) cameraInput.current.value = ''
  }

  const picked = (e) => {
    accept(e.target.files[0])
    e.target.value = ''
  }

  return (
    <div className="mb-4">
      <label className="block text-sm text-gray-600 mb-1">Photo of your university ID</label>

      {/* Hidden inputs */}
      <input ref={fileInput} type="file" accept={TYPES.join(',')} onChange={picked} className="hidden" />
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" onChange={picked} className="hidden" />

      {!file ? (
        <button
          type="button"
          onClick={() => fileInput.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            accept(e.dataTransfer.files[0])
          }}
          className={`w-full rounded-lg border-2 border-dashed px-4 py-8 text-center transition
            ${dragging ? 'border-du-green bg-green-50' : 'border-gray-300 bg-blue-50 hover:border-du-green'}`}
        >
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-du-green/10 text-3xl">
            🪪
          </div>
          <p className="font-semibold text-du-green-dark">Click to upload, or drag and drop</p>
          <p className="mt-1 text-xs text-gray-500">JPG, PNG, or WEBP · up to 3 MB</p>
        </button>
      ) : (
        <div className="rounded-lg border border-gray-300 bg-white p-3">
          {/* ID-card shaped preview frame */}
          <div className="mx-auto flex aspect-[1.586/1] w-full max-w-sm items-center justify-center overflow-hidden rounded-lg border-2 border-du-green bg-gray-100">
            {preview && <img src={preview} alt="Your university ID" className="h-full w-full object-contain" />}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <div className="min-w-0">
              <p className="truncate font-semibold text-du-green-dark">✔ {file.name}</p>
              <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInput.current.click()}
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
        </div>
      )}

      {/* Camera shortcut: opens the camera on phones, a file picker on computers */}
      {!file && (
        <button
          type="button"
          onClick={() => cameraInput.current.click()}
          className="mt-2 w-full rounded border border-du-green-dark py-2 text-sm font-semibold text-du-green-dark hover:bg-green-50 md:hidden"
        >
          📷 Take a photo with your camera
        </button>
      )}

      {error && <p className="mt-2 text-sm text-du-red">{error}</p>}

      <ul className="mt-3 space-y-1 text-xs text-gray-500">
        <li>• Show the whole ID with all four corners visible.</li>
        <li>• The name, ID number, and your photo must be readable.</li>
        <li>• Avoid glare, shadows, and blurry pictures.</li>
      </ul>
    </div>
  )
}