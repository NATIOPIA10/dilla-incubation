import { useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { toPng } from 'html-to-image'
import { supabase } from '../lib/supabase'

export default function IdCard({ student, incubationId }) {
  const cardRef = useRef(null)
  const [photo, setPhoto] = useState(null)
  const [busy, setBusy] = useState(false)

  // Load the private photo as a local blob so the card can be downloaded as an image
  useEffect(() => {
    let objectUrl = null
    let cancelled = false
    async function load() {
      if (!student.photo_path) return
      const { data } = await supabase.storage
        .from('profile-photos')
        .createSignedUrl(student.photo_path, 300)
      if (!data) return
      const blob = await (await fetch(data.signedUrl)).blob()
      objectUrl = URL.createObjectURL(blob)
      if (!cancelled) setPhoto(objectUrl)
    }
    load()
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [student.photo_path])

  async function download() {
    setBusy(true)
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 3,
        imagePlaceholder:
          'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `${incubationId.replace('/', '-')}.png`
      a.click()
    } finally {
      setBusy(false)
    }
  }

  const verifyUrl = `${window.location.origin}/verify/${student.verify_token}`

  return (
    <div>
      <div
        ref={cardRef}
        className="w-[400px] max-w-full overflow-hidden rounded-xl border-2 border-du-green bg-white shadow-lg"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 bg-du-green px-3 py-2 text-white">
          <img
            src="/logo.png"
            alt=""
            className="h-9 w-9 object-contain"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-wide">DILLA UNIVERSITY</div>
            <div className="text-[11px] text-du-gold">Incubation Center · Student ID</div>
          </div>
        </div>

        {/* Body: photo | name and ID | QR code */}
        <div className="flex items-center gap-3 p-3">
          <div className="flex h-28 w-24 shrink-0 items-center justify-center overflow-hidden rounded border-2 border-du-green bg-gray-100">
            {photo ? (
              <img src={photo} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl">👤</span>
            )}
          </div>

          <div className="min-w-0 flex-1 text-sm leading-snug">
            <div className="break-words text-base font-bold text-du-green-dark">{student.full_name}</div>
            <div className="break-words text-gray-600">{student.department}</div>
            <div className="mt-2 text-[11px] uppercase tracking-wide text-gray-500">ID number</div>
            <div className="font-mono text-lg font-bold text-du-maroon">{incubationId}</div>
          </div>

          <div className="flex shrink-0 flex-col items-center">
            <QRCodeSVG value={verifyUrl} size={84} level="M" />
            <span className="mt-1 text-[9px] text-gray-500">Scan to verify</span>
          </div>
        </div>

        {/* Footer strip */}
        <div className="bg-du-green px-3 py-1 text-center text-[10px] text-white">
          University of the Green Land
        </div>
      </div>

      <button
        onClick={download}
        disabled={busy || !photo}
        className="mt-3 rounded bg-du-green-dark px-4 py-2 text-sm font-semibold text-white hover:bg-du-green disabled:opacity-50"
      >
        {busy ? 'Preparing...' : 'Download ID card (PNG)'}
      </button>
    </div>
  )
}