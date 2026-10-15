import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import IdPhotoUpload from '../components/IdPhotoUpload'
import { supabase } from '../lib/supabase'

const MAX_SIZE = 3 * 1024 * 1024 // 3 MB, same as the bucket limit
const TYPES = ['image/jpeg', 'image/png', 'image/webp']

export default function Register() {
  const [windowInfo, setWindowInfo] = useState(undefined) // undefined = loading, null = closed
  const [form, setForm] = useState({ fullName: '', universityId: '', phone: '', year: '' })
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    supabase
      .from('registration_windows')
      .select('title, closes_at')
      .order('opens_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setWindowInfo(data ?? null))
  }, [])

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  function pickFile(e) {
    const f = e.target.files[0]
    setError('')
    if (!f) return setFile(null)
    if (!TYPES.includes(f.type)) {
      e.target.value = ''
      return setError('The ID photo must be a JPG, PNG, or WEBP image.')
    }
    if (f.size > MAX_SIZE) {
      e.target.value = ''
      return setError('The ID photo must be smaller than 3 MB.')
    }
    setFile(f)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
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
    })
    setLoading(false)
    if (regError) return setError(regError.message)
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
            The incubation center admin will review your details and ID photo. If approved,
            the admin will give you a username and a temporary password.
          </p>
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

        <label className="block text-sm text-gray-600 mb-1">University ID number</label>
        <input className={input} value={form.universityId} onChange={set('universityId')} minLength={3} required />

        <label className="block text-sm text-gray-600 mb-1">Phone number</label>
        <input className={input} type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} minLength={9} required />

        <label className="block text-sm text-gray-600 mb-1">Year of study</label>
        <select className={input} value={form.year} onChange={set('year')} required>
          <option value="">Select your year</option>
          <option value="3">2nd year</option>
          <option value="4">3rd year</option>
          <option value="5">4th year</option>
          <option value="6">5th year</option>
        </select>

        <IdPhotoUpload file={file} onChange={setFile} />
        <p className="text-xs text-gray-500 mb-4">JPG, PNG, or WEBP, up to 3 MB. The text must be readable.</p>

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