import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'

const MAX_SIZE = 2 * 1024 * 1024 // 2 MB, same as the bucket limit
const TYPES = ['image/jpeg', 'image/png', 'image/webp']

export default function ProfileForm({ student, onChanged }) {
  const fileInput = useRef(null)
  const [form, setForm] = useState({
    fullName: student.full_name ?? '',
    gender: student.gender ?? '',
    department: student.department ?? '',
    emergencyName: student.emergency_contact_name ?? '',
    emergencyPhone: student.emergency_contact_phone ?? '',
  })
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (key) => (e) => {
    const value = e.target.value
    setForm({
      ...form,
      [key]: ['fullName', 'emergencyName'].includes(key) ? value.replace(/\d/g, '') : value,
    })
  }

  // Preview: the newly chosen photo, or the saved one
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file)
      setPreview(url)
      return () => URL.revokeObjectURL(url)
    }
    if (student.photo_path) {
      supabase.storage
        .from('profile-photos')
        .createSignedUrl(student.photo_path, 300)
        .then(({ data }) => setPreview(data?.signedUrl ?? null))
    } else {
      setPreview(null)
    }
  }, [file, student.photo_path])

  function pickPhoto(e) {
    const f = e.target.files[0]
    e.target.value = ''
    setError('')
    if (!f) return
    if (!TYPES.includes(f.type)) return setError('Please choose a JPG, PNG, or WEBP photo.')
    if (f.size > MAX_SIZE) {
      return setError(`That photo is ${(f.size / 1024 / 1024).toFixed(1)} MB. The limit is 2 MB.`)
    }
    setFile(f)
  }

  async function save() {
    if (/\d/.test(form.fullName) || /\d/.test(form.emergencyName)) {
      setError('Names must not contain numbers.')
      return false
    }

    let photoPath = student.photo_path
    if (file) {
      photoPath = `${student.auth_user_id}/photo`
      const { error: upError } = await supabase.storage
        .from('profile-photos')
        .upload(photoPath, file, { upsert: true, contentType: file.type })
      if (upError) {
        setError('Could not upload the photo. Please try again.')
        return false
      }
    }

    const { data, error: e } = await supabase
      .from('students')
      .update({
        full_name: form.fullName.trim(),
        gender: form.gender || null,
        department: form.department.trim() || null,
        emergency_contact_name: form.emergencyName.trim() || null,
        emergency_contact_phone: form.emergencyPhone.trim() || null,
        photo_path: photoPath,
      })
      .eq('id', student.id)
      .select('id')

    if (e || !data?.length) {
      setError(e?.message ?? 'Your profile could not be saved.')
      return false
    }
    setFile(null)
    return true
  }

  async function saveDraft() {
    setError('')
    setNotice('')
    setBusy(true)
    const ok = await save()
    setBusy(false)
    if (ok) {
      setNotice('Draft saved ✔')
      onChanged()
    }
  }

  async function submit() {
    setError('')
    setNotice('')
    if (form.fullName.trim().length < 3) return setError('Please enter your full name.')
    if (/\d/.test(form.fullName) || /\d/.test(form.emergencyName)) {
      return setError('Names must not contain numbers.')
    }
    if (!form.gender) return setError('Please choose your gender.')
    if (!form.department.trim()) return setError('Please enter your department.')
    if (!form.emergencyName.trim() || form.emergencyPhone.trim().length < 9) {
      return setError('Please enter your emergency contact name and phone.')
    }
    if (!file && !student.photo_path) return setError('Please upload your photo.')

    if (!window.confirm('Submit your profile for review? You cannot edit it while it is being reviewed.')) return

    setBusy(true)
    const ok = await save()
    if (!ok) return setBusy(false)
    const { error: e } = await supabase.rpc('submit_profile')
    setBusy(false)
    if (e) return setError(e.message)
    onChanged()
  }

  const input =
    'w-full mb-4 rounded border border-gray-300 bg-blue-50 px-3 py-2 focus:outline-none focus:border-du-green'

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white border-t-4 border-du-green rounded shadow p-6">
        <h1 className="text-2xl font-bold text-du-green-dark">Complete your profile</h1>
        <p className="text-sm text-gray-500 mb-5">
          The admin will review your details. Once approved, you will receive your incubation center ID.
        </p>

        {student.profile_status === 'rejected' && (
          <div className="mb-5 rounded border border-du-red bg-red-50 p-3 text-sm">
            <p className="font-bold text-du-red">Your profile was not approved</p>
            <p className="text-gray-700">{student.profile_rejection_reason}</p>
            <p className="mt-1 text-gray-500">Please fix the problem and submit again.</p>
          </div>
        )}

        {/* Photo */}
        <div className="mb-5 flex items-center gap-4">
          <div className="flex aspect-[3/4] w-28 items-center justify-center overflow-hidden rounded border-2 border-du-green bg-gray-100">
            {preview ? (
              <img src={preview} alt="Your photo" className="h-full w-full object-cover" />
            ) : (
              <span className="text-4xl">👤</span>
            )}
          </div>
          <div>
            <input ref={fileInput} type="file" accept={TYPES.join(',')} onChange={pickPhoto} className="hidden" />
            <button type="button" onClick={() => fileInput.current.click()}
              className="rounded border border-du-green-dark px-4 py-2 text-sm font-semibold text-du-green-dark hover:bg-green-50">
              {preview ? 'Change photo' : 'Upload photo'}
            </button>
            <p className="mt-2 text-xs text-gray-500">
              A clear passport-style photo of your face. JPG, PNG, or WEBP, up to 2 MB.
              This photo will appear on your ID card.
            </p>
          </div>
        </div>

        <label className="block text-sm text-gray-600 mb-1">Full name</label>
        <input className={input} value={form.fullName} onChange={set('fullName')} />

        <label className="block text-sm text-gray-600 mb-1">Gender</label>
        <select className={input} value={form.gender} onChange={set('gender')}>
          <option value="">Select</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>

        <label className="block text-sm text-gray-600 mb-1">Department</label>
        <input className={input} value={form.department} onChange={set('department')} />

        <label className="block text-sm text-gray-600 mb-1">Emergency contact name</label>
        <input className={input} value={form.emergencyName} onChange={set('emergencyName')} />

        <label className="block text-sm text-gray-600 mb-1">Emergency contact phone</label>
        <input className={input} type="tel" inputMode="tel" value={form.emergencyPhone} onChange={set('emergencyPhone')} />

        {error && <p className="mb-3 text-sm text-du-red">{error}</p>}
        {notice && <p className="mb-3 text-sm text-du-green-dark">{notice}</p>}

        <div className="flex flex-wrap gap-3">
          <button disabled={busy} onClick={submit}
            className="rounded bg-du-green-dark px-5 py-2 font-semibold text-white hover:bg-du-green disabled:opacity-60">
            {busy ? 'Working...' : 'Submit for review'}
          </button>
          <button disabled={busy} onClick={saveDraft}
            className="rounded border border-gray-300 px-5 py-2 font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60">
            Save draft
          </button>
        </div>
      </div>
    </div>
  )
}