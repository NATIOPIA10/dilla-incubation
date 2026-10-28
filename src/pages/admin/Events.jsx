import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const MAX_IMAGE = 3 * 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const inputCls =
  'w-full mb-4 rounded border border-gray-300 bg-blue-50 px-3 py-2 focus:outline-none focus:border-du-green'

const publicUrl = (path) =>
  supabase.storage.from('announcement-images').getPublicUrl(path).data.publicUrl

async function sendToTelegram(eventId) {
  const { error } = await supabase.functions.invoke('notify-telegram', { body: { eventId } })
  if (!error) return null
  let msg = error.message
  try {
    const body = await error.context.json()
    if (body?.error) msg = body.error
  } catch { /* keep the generic message */ }
  return msg
}

function ImagePicker({ file, onChange }) {
  const input = useRef(null)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function pick(e) {
    const f = e.target.files[0]
    e.target.value = ''
    setError('')
    if (!f) return
    if (!IMAGE_TYPES.includes(f.type)) return setError('Please choose a JPG, PNG, or WEBP image.')
    if (f.size > MAX_IMAGE) return setError(`That image is ${(f.size / 1024 / 1024).toFixed(1)} MB. The limit is 3 MB.`)
    onChange(f)
  }

  return (
    <div className="mb-4">
      <label className="mb-1 block text-sm text-gray-600">Image (optional)</label>
      <input ref={input} type="file" accept={IMAGE_TYPES.join(',')} onChange={pick} className="hidden" />
      {!file ? (
        <button
          type="button"
          onClick={() => input.current.click()}
          className="w-full rounded-lg border-2 border-dashed border-gray-300 bg-blue-50 px-4 py-5 text-center text-sm hover:border-du-green"
        >
          🖼️ <span className="font-semibold text-du-green-dark">Click to add an image</span>
          <span className="block text-xs text-gray-500">JPG, PNG, or WEBP · up to 3 MB</span>
        </button>
      ) : (
        <div className="rounded-lg border border-gray-300 bg-white p-2">
          {preview && <img src={preview} alt="" className="max-h-48 w-full rounded object-contain" />}
          <div className="mt-2 flex gap-2 text-sm">
            <button type="button" onClick={() => input.current.click()}
              className="rounded border border-du-green-dark px-3 py-1 text-du-green-dark hover:bg-green-50">
              Replace
            </button>
            <button type="button" onClick={() => onChange(null)}
              className="rounded border border-du-red px-3 py-1 text-du-red hover:bg-red-50">
              Remove
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-du-red">{error}</p>}
    </div>
  )
}

export default function Events() {
  const { session } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')

  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [location, setLocation] = useState('')
  const [link, setLink] = useState('')
  const [image, setImage] = useState(null)
  const [telegram, setTelegram] = useState(true)
  const [isPublic, setIsPublic] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [sendingId, setSendingId] = useState(null)

  const load = useCallback(async () => {
    const { data, error: e } = await supabase
      .from('events').select('*').order('created_at', { ascending: false })
    if (e) setListError(e.message)
    else {
      setListError('')
      setEvents(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function post(e) {
    e.preventDefault()
    setError('')
    setNotice('')

    const cleanLink = link.trim()
    if (cleanLink && !/^https?:\/\//i.test(cleanLink)) {
      return setError('The link must start with http:// or https://')
    }

    setBusy(true)

    // 1. Upload the image (if any)
    let imagePath = null
    if (image) {
      const ext = image.type === 'image/png' ? 'png' : image.type === 'image/webp' ? 'webp' : 'jpg'
      imagePath = `${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('announcement-images')
        .upload(imagePath, image, { contentType: image.type })
      if (upErr) {
        setBusy(false)
        return setError('Could not upload the image. Please try again.')
      }
    }

    // 2. Save the announcement
    const { data, error: insErr } = await supabase
      .from('events')
      .insert({
        title: title.trim(),
        details: details.trim(),
        event_date: eventDate ? new Date(eventDate).toISOString() : null,
        location: location.trim() || null,
        link_url: cleanLink || null,
        image_path: imagePath,
        is_public: isPublic,
        created_by: session.user.id,
      })
      .select('id')
      .single()

    if (insErr) {
      if (imagePath) await supabase.storage.from('announcement-images').remove([imagePath])
      setBusy(false)
      return setError(insErr.message)
    }

    // 3. Telegram (optional)
    let message = isPublic
      ? 'Announcement posted on the student dashboards and on the public website ✔'
      : 'Announcement posted on the student dashboards ✔'
    if (telegram) {
      const tgError = await sendToTelegram(data.id)
      message = tgError
        ? `Posted, but Telegram failed: ${tgError}. You can retry from the list below.`
        : `${message.replace(' ✔', '')} and sent to Telegram ✔`
    }
    setBusy(false)
    setNotice(message)
    setTitle('')
    setDetails('')
    setEventDate('')
    setLocation('')
    setLink('')
    setImage(null)
    setIsPublic(false)
    load()
  }

  async function resend(id) {
    setSendingId(id)
    setNotice('')
    const tgError = await sendToTelegram(id)
    setSendingId(null)
    setNotice(tgError ? `Telegram failed: ${tgError}` : 'Sent to Telegram ✔')
    load()
  }

  async function togglePublic(ev) {
    const { error: e } = await supabase.from('events').update({ is_public: !ev.is_public }).eq('id', ev.id)
    if (e) return setListError(e.message)
    load()
  }

  async function remove(ev) {
    if (!window.confirm(`Delete "${ev.title}"? Students will no longer see it. A message already sent to Telegram stays there.`)) return
    const { error: e } = await supabase.from('events').delete().eq('id', ev.id)
    if (e) return setListError(e.message)
    if (ev.image_path) await supabase.storage.from('announcement-images').remove([ev.image_path])
    load()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <form onSubmit={post} className="h-fit rounded-lg border-t-4 border-du-green bg-white p-5 shadow">
        <h2 className="mb-4 text-lg font-bold text-du-green-dark">New announcement</h2>

        <label className="mb-1 block text-sm text-gray-600">Title</label>
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} required />

        <label className="mb-1 block text-sm text-gray-600">Details</label>
        <textarea className={inputCls} rows={5} value={details} onChange={(e) => setDetails(e.target.value)} required />

        <label className="mb-1 block text-sm text-gray-600">Date and time (optional)</label>
        <input className={inputCls} type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />

        <label className="mb-1 block text-sm text-gray-600">Location (optional)</label>
        <input className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} />

        <label className="mb-1 block text-sm text-gray-600">Link (optional)</label>
        <input className={inputCls} value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" />

        <ImagePicker file={image} onChange={setImage} />

        <label className="mb-2 flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={telegram} onChange={(e) => setTelegram(e.target.checked)} />
          Also send to Telegram
        </label>

        <label className="mb-1 flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          Show on the public website
        </label>
        <p className="mb-4 text-xs text-gray-500">
          Anyone on the internet can read public announcements. Do not include private information.
        </p>

        {error && <p className="mb-3 text-sm text-du-red">{error}</p>}
        {notice && <p className="mb-3 text-sm text-du-green-dark">{notice}</p>}

        <button disabled={busy}
          className="w-full rounded bg-du-green-dark py-2 font-semibold text-white hover:bg-du-green disabled:opacity-60">
          {busy ? 'Posting...' : 'Post announcement'}
        </button>
      </form>

      <div>
        <h2 className="mb-3 text-lg font-bold text-du-green-dark">Posted announcements</h2>
        {listError && <p className="mb-3 text-sm text-du-red">{listError}</p>}
        {loading && <p className="text-gray-400">Loading...</p>}
        {!loading && events.length === 0 && <p className="text-gray-400">No announcements yet.</p>}

        <div className="space-y-3">
          {events.map((ev) => (
            <div key={ev.id} className="rounded-lg bg-white p-4 shadow">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-bold text-du-green-dark">{ev.title}</h3>
                <span className="flex shrink-0 items-center gap-2">
                  {ev.is_public && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-du-blue">Public</span>
                  )}
                  <span className="text-xs text-gray-400">{new Date(ev.created_at).toLocaleDateString()}</span>
                </span>
              </div>
              {(ev.event_date || ev.location) && (
                <p className="mt-1 text-xs text-gray-500">
                  {ev.event_date && `🗓 ${new Date(ev.event_date).toLocaleString()}`}
                  {ev.event_date && ev.location && ' · '}
                  {ev.location && `📍 ${ev.location}`}
                </p>
              )}
              {ev.image_path && (
                <img src={publicUrl(ev.image_path)} alt="" className="mt-2 max-h-40 w-full rounded object-cover" />
              )}
              <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm text-gray-700">{ev.details}</p>
              {ev.link_url && (
                <a href={ev.link_url} target="_blank" rel="noreferrer noopener"
                  className="mt-1 inline-block break-all text-xs text-du-blue underline">
                  🔗 {ev.link_url}
                </a>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                {ev.telegram_sent_at ? (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 font-semibold text-du-green-dark">
                    Telegram: sent {new Date(ev.telegram_sent_at).toLocaleString()}
                  </span>
                ) : ev.telegram_error ? (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 font-semibold text-du-red" title={ev.telegram_error}>
                    Telegram failed: {ev.telegram_error}
                  </span>
                ) : (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-500">Not sent to Telegram</span>
                )}
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => togglePublic(ev)} className="text-du-blue hover:underline">
                    {ev.is_public ? 'Hide from website' : 'Show on website'}
                  </button>
                  <button disabled={sendingId === ev.id} onClick={() => resend(ev.id)}
                    className="text-du-blue hover:underline disabled:opacity-50">
                    {sendingId === ev.id ? 'Sending...' : ev.telegram_sent_at ? 'Send again' : 'Send to Telegram'}
                  </button>
                  <button onClick={() => remove(ev)} className="text-du-red hover:underline">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}