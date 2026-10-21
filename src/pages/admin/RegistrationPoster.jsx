import { useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { toPng } from 'html-to-image'
import { supabase } from '../../lib/supabase'
import { CONTACT, SITE_URL } from '../../lib/config'

const fmt = (iso) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

function pickDefault(list) {
  const now = new Date()
  const open = list.find((w) => w.is_active && new Date(w.opens_at) <= now && new Date(w.closes_at) > now)
  return open ?? list.find((w) => w.is_active && new Date(w.opens_at) > now) ?? list[0] ?? null
}

export default function RegistrationPoster() {
  const ref = useRef(null)
  const [windows, setWindows] = useState([])
  const [selected, setSelected] = useState('')
  const [showDates, setShowDates] = useState(true)
  const [base, setBase] = useState((SITE_URL || window.location.origin).replace(/\/+$/, ''))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('registration_windows')
      .select('id, title, opens_at, closes_at, is_active')
      .order('opens_at', { ascending: false })
      .then(({ data }) => {
        const list = data ?? []
        setWindows(list)
        const d = pickDefault(list)
        if (d) setSelected(d.id)
      })
  }, [])

  const win = windows.find((w) => w.id === selected) ?? null
  const cleanBase = base.trim().replace(/\/+$/, '')
  const validBase = /^https?:\/\/[^\s]{3,200}$/.test(cleanBase)
  const address = `${cleanBase}/register`
  const isLocal = /localhost|127\.0\.0\.1|192\.168\./.test(address)

  const tg = (CONTACT.telegram || '').replace(/^@/, '')
  const contactLines = [
    CONTACT.office && `📍 ${CONTACT.office}`,
    CONTACT.hours && `🕒 ${CONTACT.hours}`,
    CONTACT.phone && `📞 ${CONTACT.phone}`,
    tg && `✈️ @${tg}`,
  ].filter(Boolean)

  async function download() {
    setError('')
    setBusy(true)
    try {
      const dataUrl = await toPng(ref.current, {
        pixelRatio: 3,
        imagePlaceholder:
          'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = 'registration-poster.png'
      a.click()
    } catch {
      setError('Could not create the image. Please use Print / Save as PDF instead.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="mb-4 grid gap-4 rounded-lg bg-white p-4 shadow md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-gray-600">Registration window on the poster</label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full rounded border border-gray-300 bg-blue-50 px-3 py-2 text-sm focus:border-du-green focus:outline-none"
          >
            <option value="">No window (general poster)</option>
            {windows.map((w) => (
              <option key={w.id} value={w.id}>
                {w.title} ({fmt(w.opens_at)} to {fmt(w.closes_at)})
              </option>
            ))}
          </select>
          <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={showDates} onChange={(e) => setShowDates(e.target.checked)} />
            Show the opening and closing dates
          </label>
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-600">Website address in the QR code</label>
          <input
            value={base}
            onChange={(e) => setBase(e.target.value)}
            className="w-full rounded border border-gray-300 bg-blue-50 px-3 py-2 text-sm focus:border-du-green focus:outline-none"
          />
          <p className="mt-1 text-xs text-gray-500">The code opens: {address}</p>
          {!validBase && (
            <p className="mt-1 text-sm font-semibold text-du-red">The address must start with https://</p>
          )}
          {validBase && isLocal && (
            <p className="mt-1 text-sm font-semibold text-du-red">
              This address only works on your own computer or network. Type your live address here, or set it in
              src/lib/config.js, before you print the poster.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 md:col-span-2">
          <button
            onClick={download}
            disabled={busy || !validBase}
            className="rounded bg-du-green-dark px-4 py-2 text-sm font-semibold text-white hover:bg-du-green disabled:opacity-50"
          >
            {busy ? 'Preparing...' : 'Download image (PNG)'}
          </button>
          <button
            onClick={() => window.print()}
            disabled={!validBase}
            className="rounded border border-du-green-dark px-4 py-2 text-sm font-semibold text-du-green-dark hover:bg-green-50 disabled:opacity-50"
          >
            Print / Save as PDF
          </button>
          <span className="text-xs text-gray-500">
            To print, choose A4 and set margins to None. In Chrome, switch on Background graphics.
          </span>
        </div>
        {error && <p className="text-sm text-du-red md:col-span-2">{error}</p>}
      </div>

      <div className="overflow-auto rounded border border-gray-300 bg-gray-100 p-3">
        <div
          id="poster-print"
          ref={ref}
          className="flex flex-col bg-white"
          style={{ width: 794, height: 1120, boxSizing: 'border-box', overflow: 'hidden', fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          {/* Header */}
          <div className="flex items-center gap-4 bg-du-green px-10 py-6 text-white">
            <img
              src="/logo.png"
              alt=""
              style={{ height: 84, width: 84, objectFit: 'contain' }}
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
            <div className="leading-tight">
              <div className="text-3xl font-bold tracking-wide">DILLA UNIVERSITY</div>
              <div className="text-xl text-du-gold">Incubation Center</div>
            </div>
          </div>

          {/* Body */}
          <div className="flex flex-1 flex-col items-center px-12 py-8 text-center">
            <h1 className="text-5xl font-bold text-du-green-dark">New Student Registration</h1>
            {win && <p className="mt-3 text-2xl text-du-maroon">{win.title}</p>}
            {win && showDates && (
              <p className="mt-2 text-xl text-gray-700">
                Open from {fmt(win.opens_at)} to {fmt(win.closes_at)}
              </p>
            )}

            <div className="mt-8 rounded-2xl border-8 border-du-green bg-white p-5">
              {validBase ? (
                <QRCodeSVG value={address} size={360} level="M" />
              ) : (
                <div style={{ width: 360, height: 360 }} />
              )}
            </div>
            <p className="mt-5 text-3xl font-bold text-du-green-dark">Scan to register</p>
            <p className="mt-1 break-all text-lg text-gray-600">{address}</p>

            <div className="mt-7 w-full rounded-xl bg-green-50 p-5 text-left text-lg text-gray-800">
              <p className="font-bold text-du-green-dark">Who can register</p>
              <p>Dilla University students from the 2nd to the 5th year.</p>
              <p className="mt-3 font-bold text-du-green-dark">Please have ready</p>
              <ul className="ml-6 list-disc">
                <li>A clear photo of your university ID</li>
                <li>Your mobile phone number</li>
                <li>At least 2 project titles you want to work on</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-du-green px-10 py-4 text-center text-white">
            {contactLines.length > 0 ? (
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-base">
                {contactLines.map((l) => (
                  <span key={l}>{l}</span>
                ))}
              </div>
            ) : (
              <div className="text-base">University of the Green Land</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}