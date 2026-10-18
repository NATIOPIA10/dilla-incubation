import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import IdPhotoUpload from '../components/IdPhotoUpload'
import { nationalMobile } from '../lib/phone'

const MIN_TITLES = 3
const MAX_TITLES = 6

export default function Register() {
  const [windowInfo, setWindowInfo] = useState(undefined) // undefined = loading, null = closed
  const [form, setForm] = useState({ fullName: '', universityId: '', phone: '', year: '' })
  const [titles, setTitles] = useState(['', '', ''])
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [telegramUrl, setTelegramUrl] = useState('')
  const [telegramError, setTelegramError] = useState('')
  const [telegramDetails, setTelegramDetails] = useState(null)
  const [telegramRetrying, setTelegramRetrying] = useState(false)

  useEffect(() => {
    supabase
      .from('registration_windows')
      .select('title, closes_at')
      .order('opens_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setWindowInfo(data ?? null))
  }, [])

  const set = (key) => (e) => {
    const value = e.target.value
    const sanitized =
      key === 'universityId' ? value.toUpperCase() :
      key === 'fullName' ? value.replace(/\d/g, '') :
      value
    setForm({ ...form, [key]: sanitized })
  }

  const setTitle = (i, value) => setTitles(titles.map((t, idx) => (idx === i ? value : t)))
  const addTitle = () => titles.length < MAX_TITLES && setTitles([...titles, ''])
  const removeTitle = (i) => titles.length > MIN_TITLES && setTitles(titles.filter((_, idx) => idx !== i))

  // Titles that count: not empty, not repeated
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

  async function prepareTelegramLink({ universityId, photoPath }) {
    try {
      const { data, error: linkError } = await supabase.functions.invoke(
        'create-telegram-link',
        { body: { universityId, photoPath } }
      )

      if (linkError || !data?.url) {
        console.error('Telegram link setup failed:', linkError?.message ?? data?.error)
        setTelegramError('Could not prepare Telegram linking. Please retry or contact the Incubation Center.')
        return
      }

      setTelegramUrl(data.url)
      setTelegramError('')
    } catch (linkError) {
      console.error(
        'Telegram link setup failed:',
        linkError instanceof Error ? linkError.message : String(linkError)
      )
      setTelegramError('Could not prepare Telegram linking. Please retry or contact the Incubation Center.')
    }
  }

  async function retryTelegramLink() {
    if (!telegramDetails) return
    setTelegramRetrying(true)
    await prepareTelegramLink(telegramDetails)
    setTelegramRetrying(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!/^[A-Z]+-\d+\/\d{2}$/.test(form.universityId)) {
      return setError('University ID must use the format RMNS-7783/23.')
    }
    if (/\d/.test(form.fullName)) {
      return setError('Full name must not contain numbers.')
    }

    const cleaned = cleanedTitles()
    if (cleaned.length < MIN_TITLES) {
      return setError(`Please enter at least ${MIN_TITLES} different project titles.`)
    }
    if (cleaned.some((t) => t.length < 3 || t.length > 150)) {
      return setError('Each project title must be between 3 and 150 characters.')
    }
        if (!nationalMobile(form.phone)) {
      return setError('Please enter a valid mobile number, for example 0911 234 567 or 0711 234 567.')
    }
    
    if (!file) return setError('Please upload a photo of your university ID.')

    setLoading(true)

    // 1. Upload the ID photo with a random, unguessable file name
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const path = `${crypto.randomUUID()}.${ext}`
    const { error: upError } = await supabase.storage
      .from('registration-ids')
      .upload(path, file, { contentType: file.type })
    if (upError) {
      setLoading(false)
      return setError('Could not upload the ID photo. Please try again.')
    }

    // 2. Submit the registration (the database checks all the rules)
    const { error: regError } = await supabase.rpc('register_student', {
      p_university_id: form.universityId,
      p_id_photo_path: path,
      p_full_name: form.fullName,
      p_phone: form.phone,
      p_year: Number(form.year),
      p_titles: cleaned,
    })
    if (regError) {
      setLoading(false)
      return setError(regError.message)
    }

    const linkDetails = { universityId: form.universityId, photoPath: path }
    setTelegramDetails(linkDetails)
    await prepareTelegramLink(linkDetails)
    setLoading(false)
    setDone(true)
  }

  const input =
    'w-full mb-4 rounded border border-gray-300 bg-blue-50 px-3 py-2 focus:outline-none focus:border-du-green'

  if (windowInfo === undefined) {
    return <p className="text-center p-10 text-gray-500">Loading...</p>
  }

  if (windowInfo === null) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center">
        <div className="bg-white border-t-4 border-du-maroon rounded shadow p-8">
          <h1 className="text-2xl font-bold text-du-maroon mb-2">Registration is closed</h1>
          <p className="text-gray-600 mb-4">
            New student registration is not open right now. Please check the announcements
            on our Telegram channel.
          </p>
          <Link to="/" className="text-du-green-dark underline">Back to login</Link>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center">
        <div className="bg-white border-t-4 border-du-green rounded shadow p-8">
          <h1 className="text-2xl font-bold text-du-green-dark mb-2">Registration submitted ✔</h1>
          <p className="text-gray-600 mb-4">
            The incubation center admin will review your details, project titles, and ID photo.
            Once approved, your username and temporary password can be sent to your linked Telegram account.
          </p>
          {telegramUrl ? (
            <a
              href={telegramUrl}
              target="_blank"
              rel="noreferrer"
              className="mb-4 inline-block rounded bg-du-blue px-5 py-2 font-semibold text-white hover:opacity-90"
            >
              Get your login on Telegram
            </a>
          ) : (
            <div className="mb-4">
              <p className="mb-2 text-sm text-du-red">
                {telegramError || 'Telegram linking is unavailable. Contact the Incubation Center for your login after approval.'}
              </p>
              <button
                type="button"
                onClick={retryTelegramLink}
                disabled={telegramRetrying}
                className="rounded bg-du-blue px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                {telegramRetrying ? 'Retrying...' : 'Retry Telegram link'}
              </button>
            </div>
          )}
          <Link to="/" className="text-du-green-dark underline">Back to login</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <form onSubmit={handleSubmit} className="bg-white border-t-4 border-du-green rounded shadow p-6">
        <h1 className="text-2xl font-bold text-du-green-dark">New Student Registration</h1>
        <p className="text-sm text-gray-500 mb-5">
          {windowInfo.title} · open until {new Date(windowInfo.closes_at).toLocaleDateString()}.
          Only Dilla University students above second year can register.
        </p>

        <label className="block text-sm text-gray-600 mb-1">Full name</label>
        <input className={input} value={form.fullName} onChange={set('fullName')} minLength={3} required />

        <label className="block text-sm text-gray-600 mb-1">University ID</label>
        <input
          className={input}
          value={form.universityId}
          onChange={set('universityId')}
          type="text"
          autoCapitalize="characters"
          pattern="[A-Za-z]+-[0-9]+/[0-9]{2}"
          placeholder="RMNS-7783/23"
          title="Use the format RMNS-7783/23"
          required
        />

        <label className="block text-sm text-gray-600 mb-1">Phone number</label>
        <input className={input} type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} minLength={9} required />

        <label className="block text-sm text-gray-600 mb-1">Year of study</label>
        <select className={input} value={form.year} onChange={set('year')} required>
          <option value="">Select your year</option>
          <option value="2">2nd year</option>
          <option value="3">3rd year</option>
          <option value="4">4th year</option>
          <option value="5">5th year</option>
        </select>

        {/* Project titles */}
        <div className="mb-4 rounded-lg border border-du-green/40 bg-green-50/50 p-4">
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm font-semibold text-du-green-dark">
              Project titles you want to work on
            </label>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                validCount >= MIN_TITLES ? 'bg-green-100 text-du-green-dark' : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {Math.min(validCount, MIN_TITLES)} of {MIN_TITLES} required
            </span>
          </div>
          <p className="mb-3 text-xs text-gray-500">
            Enter at least {MIN_TITLES} different titles for the projects you plan to build at the
            incubation center. Empty and repeated titles do not count.
          </p>

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

        <IdPhotoUpload file={file} onChange={setFile} />

        {error && <p className="text-sm text-du-red mb-3">{error}</p>}

        <button
          disabled={loading}
          className="w-full rounded bg-du-green-dark py-2 font-semibold text-white hover:bg-du-green disabled:opacity-60"
        >
          {loading ? 'Submitting...' : 'Submit registration'}
        </button>
      </form>
    </div>
  )
}