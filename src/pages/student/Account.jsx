import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'

const TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ext = (f) => (f.type === 'image/png' ? 'png' : f.type === 'image/webp' ? 'webp' : 'jpg')

function Figure({ label, url }) {
  return (
    <div>
      <p className="mb-1 text-xs text-gray-500">{label}</p>
      <div className="flex aspect-[3/4] w-28 items-center justify-center overflow-hidden rounded border-2 border-du-green bg-gray-100">
        {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <span className="text-3xl">👤</span>}
      </div>
    </div>
  )
}

function PhotoChange({ student, kind, title, help, bucket, maxBytes, canSee, requests, onChanged }) {
  const input = useRef(null)
  const [file, setFile] = useState(null)
  const [localUrl, setLocalUrl] = useState(null)
  const [currentUrl, setCurrentUrl] = useState(null)
  const [pendingUrl, setPendingUrl] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const mine = requests.filter((r) => r.kind === kind)
  const pending = mine.find((r) => r.status === 'pending')
  const last = mine.find((r) => r.status !== 'pending')

  // The current photo (only the profile photo can be shown to the student)
  useEffect(() => {
    if (!canSee) return
    supabase
      .from('students')
      .select('photo_path')
      .eq('id', student.id)
      .single()
      .then(async ({ data }) => {
        if (!data?.photo_path) return
        const { data: s } = await supabase.storage.from(bucket).createSignedUrl(data.photo_path, 300)
        setCurrentUrl(s?.signedUrl ?? null)
      })
  }, [canSee, bucket, student.id, requests])

  // The photo that is waiting for approval
  useEffect(() => {
    setPendingUrl(null)
    if (!canSee || !pending) return
    supabase.storage
      .from(bucket)
      .createSignedUrl(pending.new_path, 300)
      .then(({ data }) => setPendingUrl(data?.signedUrl ?? null))
  }, [canSee, bucket, pending?.id])

  // Preview of the file just chosen
  useEffect(() => {
    if (!file) {
      setLocalUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setLocalUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function pick(e) {
    const f = e.target.files[0]
    e.target.value = ''
    setError('')
    if (!f) return
    if (!TYPES.includes(f.type)) return setError('Please choose a JPG, PNG, or WEBP image.')
    if (f.size > maxBytes) {
      return setError(`That photo is ${(f.size / 1024 / 1024).toFixed(1)} MB. The limit is ${maxBytes / 1024 / 1024} MB.`)
    }
    setFile(f)
  }

  async function submit() {
    setError('')
    setBusy(true)
    const path =
      kind === 'profile'
        ? `${student.auth_user_id}/change-${crypto.randomUUID()}.${ext(file)}`
        : `${crypto.randomUUID()}.${ext(file)}`
    const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type })
    if (upErr) {
      setBusy(false)
      return setError('Could not upload the photo. Please try again.')
    }
    const { error: insErr } = await supabase
      .from('photo_change_requests')
      .insert({ student_id: student.id, kind, new_path: path })
    setBusy(false)
    if (insErr) return setError(insErr.code === '23505' ? 'You already have a request waiting.' : insErr.message)
    setFile(null)
    onChanged()
  }

  async function cancel() {
    if (!window.confirm('Cancel this request?')) return
    const { error: e } = await supabase.from('photo_change_requests').delete().eq('id', pending.id)
    if (e) return setError(e.message)
    onChanged()
  }

  return (
    <div className="rounded-lg border-t-4 border-du-green bg-white p-5 shadow">
      <h3 className="font-bold text-du-green-dark">{title}</h3>
      <p className="mb-3 text-sm text-gray-600">{help}</p>

      {canSee && (
        <div className="mb-4 flex gap-4">
          <Figure label="Current photo" url={currentUrl} />
          {pending && <Figure label="Waiting for approval" url={pendingUrl} />}
        </div>
      )}

      {!pending && last?.status === 'rejected' && (
        <p className="mb-3 rounded bg-red-50 p-2 text-sm text-du-red">
          Your last request was not approved: {last.reason}
        </p>
      )}
      {!pending && last?.status === 'approved' && (
        <p className="mb-3 rounded bg-green-50 p-2 text-sm text-du-green-dark">
          ✔ Your last change was approved on {new Date(last.reviewed_at).toLocaleDateString()}.
        </p>
      )}

      {pending ? (
        <div>
          <p className="rounded bg-yellow-100 px-3 py-2 text-sm font-semibold text-yellow-800">
            Waiting for admin approval since {new Date(pending.created_at).toLocaleDateString()}. Your current photo
            stays in use until it is approved.
          </p>
          <button onClick={cancel} className="mt-3 text-sm text-du-red hover:underline">
            Cancel this request
          </button>
        </div>
      ) : (
        <>
          <input ref={input} type="file" accept={TYPES.join(',')} onChange={pick} className="hidden" />
          {file && localUrl ? (
            <div>
              <p className="mb-1 text-xs text-gray-500">New photo</p>
              <img src={localUrl} alt="" className="max-h-56 rounded border-2 border-du-green object-contain" />
              <div className="mt-3 flex gap-3">
                <button
                  disabled={busy}
                  onClick={submit}
                  className="rounded bg-du-green-dark px-4 py-2 text-sm font-semibold text-white hover:bg-du-green disabled:opacity-60"
                >
                  {busy ? 'Sending...' : 'Send for approval'}
                </button>
                <button
                  disabled={busy}
                  onClick={() => setFile(null)}
                  className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Choose another
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => input.current.click()}
              className="rounded border border-du-green-dark px-4 py-2 text-sm font-semibold text-du-green-dark hover:bg-green-50"
            >
              Choose a new photo
            </button>
          )}
        </>
      )}

      {error && <p className="mt-3 text-sm text-du-red">{error}</p>}
    </div>
  )
}
function NamePrivacy({ student }) {
  const [hidden, setHidden] = useState(!!student.hide_public_name)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function toggle() {
    setError('')
    setBusy(true)
    const next = !hidden
    const { error: e } = await supabase.rpc('set_public_name_hidden', { p_hidden: next })
    setBusy(false)
    if (e) return setError(e.message)
    setHidden(next)
  }

  return (
    <div className="mt-5 rounded-lg border-t-4 border-du-green bg-white p-5 shadow">
      <h3 className="font-bold text-du-green-dark">Public website</h3>
      <p className="mb-3 text-sm text-gray-600">
        When the admin verifies one of your projects, it can appear on the public website, which anyone can see.
      </p>
      <label className="flex items-start gap-3 text-sm text-gray-800">
        <input type="checkbox" className="mt-1" checked={!hidden} disabled={busy} onChange={toggle} />
        <span>
          <b>Show my name and department</b> next to my verified projects on the public website.
          <span className="block text-xs text-gray-500">
            If you turn this off, your projects appear as &ldquo;by a Dilla University student&rdquo;. Members of the
            center still see your name in the showcase.
          </span>
        </span>
      </label>
      {error && <p className="mt-2 text-sm text-du-red">{error}</p>}
    </div>
  )
}

export default function Account({ student, go }) {
  const [requests, setRequests] = useState(undefined)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('photo_change_requests')
      .select('*')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false })
    setRequests(data ?? [])
  }, [student.id])

  useEffect(() => {
    load()
  }, [load])

  if (requests === undefined) return <p className="text-gray-400">Loading...</p>

  return (
    <div>
      <button onClick={() => go('home')} className="mb-3 text-sm text-du-blue hover:underline">
        ← Back to home
      </button>
      <h2 className="mb-1 text-xl font-bold text-du-green-dark">⚙️ My account</h2>
      <p className="mb-5 text-sm text-gray-500">
        Uploaded a wrong photo? Ask for a change here. The admin checks the new photo before it replaces the old one.
      </p>

      <div className="space-y-5">
        <PhotoChange
          student={student}
          kind="profile"
          title="Profile photo"
          help="This photo appears on your ID card. Use a clear passport-style photo of your face (up to 2 MB)."
          bucket="profile-photos"
          maxBytes={2 * 1024 * 1024}
          canSee
          requests={requests}
          onChanged={load}
        />
        <PhotoChange
          student={student}
          kind="university_id"
          title="University ID photo"
          help="Upload a clear photo of your whole university ID, with all four corners visible (up to 3 MB). Only the admin can see it."
          bucket="registration-ids"
          maxBytes={3 * 1024 * 1024}
          canSee={false}
          requests={requests}
          onChanged={load}
        />
      </div>
          <NamePrivacy student={student} />
    </div>
  )
}