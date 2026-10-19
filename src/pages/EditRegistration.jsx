import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { nationalMobile } from '../lib/phone'
import IdPhotoUpload from '../components/IdPhotoUpload'

const MIN_TITLES = 2
const MAX_TITLES = 6

export default function EditRegistration() {
  const { token } = useParams()
  const [info, setInfo] = useState(undefined) // undefined = loading, null = invalid
  const [form, setForm] = useState({ fullName: '', universityId: '', phone: '', year: '' })
  const [titles, setTitles] = useState(['', ''])
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    supabase.rpc('get_registration_for_edit', { p_token: token }).then(({ data }) => {
      const row = data?.[0]
      if (!row) return setInfo(null)
      setInfo(row)
      setForm({
        fullName: row.full_name ?? '',
        universityId: row.university_id ?? '',
        phone: row.phone ?? '',
        year: String(row.year_of_study ?? ''),
      })
      const t = row.titles?.length ? row.titles : ['', '']
      setTitles(t.length < MIN_TITLES ? [...t, ''] : t)
    })
  }, [token])

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const setTitle = (i, v) => setTitles(titles.map((t, idx) => (idx === i ? v : t)))
  const addTitle = () => titles.length < MAX_TITLES && setTitles([...titles, ''])
  const removeTitle = (i) => titles.length > MIN_TITLES && setTitles(titles.filter((_, idx) => idx !== i))

  const cleanedTitles = () => {
    const seen = new Set()
    const out = []
    for (const t of titles) {
      const v = t.trim()
      if (v && !seen.has(v.toLowerCase())) {
        seen.add(v.toLowerCase())
        out.push(v)
      }
    }
    return out
  }
  const validCount = cleanedTitles().length

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const cleaned = cleanedTitles()
    if (cleaned.length < MIN_TITLES) return setError(`Please enter at least ${MIN_TITLES} different project titles.`)
    if (cleaned.some((t) => t.length < 3 || t.length > 150)) {
      return setError('Each project title must be between 3 and 150 characters.')
    }
    if (!nationalMobile(form.phone)) {
      return setError('Please enter a valid mobile number, for example 0911 234 567 or 0711 234 567.')
    }

    setLoading(true)

    // A new ID photo is optional: without one, the current photo stays
    let photoPath = null
    if (file) {
      const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
      photoPath = `${crypto.randomUUID()}.${ext}`
      const { error: upError } = await supabase.storage
        .from('registration-ids')
        .upload(photoPath, file, { contentType: file.type })
      if (upError) {
        setLoading(false)
        return setError('Could not upload the ID photo. Please try again.')
      }
    }

    const { error: err } = await supabase.rpc('update_registration', {
      p_token: token,
      p_university_id: form.universityId,
      p_full_name: form.fullName,
      p_phone: form.phone,
      p_year: Number(form.year),
      p_titles: cleaned,
      p_new_photo_path: photoPath,
    })
    setLoading(false)
    if (err) return setError(err.message)
    setDone(true)
  }

  const input =
    'w-full mb-4 rounded border border-gray-300 bg-blue-50 px-3 py-2 focus:outline-none focus:border-du-green'

  if (info === undefined) return <p className="p-10 text-center text-gray-500">Loading...</p>

  if (info === null) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <div className="rounded border-t-4 border-du-maroon bg-white p-8 shadow">
          <h1 className="mb-2 text-2xl font-bold text-du-maroon">This link is not valid</h1>
          <p className="mb-4 text-gray-600">
            The link may have expired, or the correction was already sent. Please contact the Incubation Center.
          </p>
          <Link to="/" className="text-du-green-dark underline">Back to the home page</Link>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <div className="rounded border-t-4 border-du-green bg-white p-8 shadow">
          <h1 className="mb-2 text-2xl font-bold text-du-green-dark">Correction sent ✔</h1>
          <p className="mb-4 text-gray-600">
            The Incubation Center will review your registration again. If it is approved, you will receive your login.
          </p>
          <Link to="/" className="text-du-green-dark underline">Back to the home page</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <form onSubmit={handleSubmit} className="rounded border-t-4 border-du-green bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-du-green-dark">Correct your registration</h1>

        <div className="my-4 rounded border border-yellow-400 bg-yellow-50 p-3 text-sm">
          <p className="font-bold text-yellow-900">The Incubation Center asks you to correct:</p>
          <p className="mt-1 text-yellow-900">{info.reason}</p>
        </div>

        <label className="mb-1 block text-sm text-gray-600">Full name</label>
        <input className={input} value={form.fullName} onChange={set('fullName')} minLength={3} required />

        <label className="mb-1 block text-sm text-gray-600">University ID number</label>
        <input className={input} value={form.universityId} onChange={set('universityId')} minLength={3} required />

        <label className="mb-1 block text-sm text-gray-600">Phone number</label>
        <input className={input} type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} minLength={9} required />

        <label className="mb-1 block text-sm text-gray-600">Year of study</label>
        <select className={input} value={form.year} onChange={set('year')} required>
          <option value="">Select your year</option>
          <option value="2">2nd year</option>
          <option value="3">3rd year</option>
          <option value="4">4th year</option>
          <option value="5">5th year</option>
        </select>

        <div className="mb-4 rounded-lg border border-du-green/40 bg-green-50/50 p-4">
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm font-semibold text-du-green-dark">Project titles you want to work on</label>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                validCount >= MIN_TITLES ? 'bg-green-100 text-du-green-dark' : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {Math.min(validCount, MIN_TITLES)} of {MIN_TITLES} required
            </span>
          </div>
          {titles.map((t, i) => (
            <div key={i} className="mb-2 flex items-center gap-2">
              <span className="w-5 shrink-0 text-sm text-gray-500">{i + 1}.</span>
              <input
                className="w-full rounded border border-gray-300 bg-blue-50 px-3 py-2 focus:border-du-green focus:outline-none"
                value={t}
                onChange={(e) => setTitle(i, e.target.value)}
                maxLength={150}
                placeholder={`Project title ${i + 1}`}
              />
              {titles.length > MIN_TITLES && (
                <button
                  type="button"
                  onClick={() => removeTitle(i)}
                  className="shrink-0 px-2 text-xl leading-none text-du-red hover:opacity-70"
                  aria-label={`Remove title ${i + 1}`}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {titles.length < MAX_TITLES && (
            <button type="button" onClick={addTitle} className="mt-1 text-sm font-semibold text-du-blue hover:underline">
              + Add another title
            </button>
          )}
        </div>

        <p className="mb-2 text-sm text-gray-600">
          Upload a new photo of your university ID only if it needs to be corrected. If you leave it empty, your
          current photo stays.
        </p>
        <IdPhotoUpload file={file} onChange={setFile} />

        {error && <p className="mb-3 text-sm text-du-red">{error}</p>}

        <button
          disabled={loading}
          className="w-full rounded bg-du-green-dark py-2 font-semibold text-white hover:bg-du-green disabled:opacity-60"
        >
          {loading ? 'Sending...' : 'Send my correction'}
        </button>
      </form>
    </div>
  )
}