import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const BUCKET = { profile: 'profile-photos', university_id: 'registration-ids' }
const LABEL = { profile: 'Profile photo', university_id: 'University ID photo' }

function Photo({ bucket, path, label, wide }) {
  const [url, setUrl] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!path) {
      setFailed(true)
      return
    }
    supabase.storage
      .from(bucket)
      .createSignedUrl(path, 300)
      .then(({ data, error }) => {
        if (error || !data) setFailed(true)
        else setUrl(data.signedUrl)
      })
  }, [bucket, path])

  return (
    <div>
      <p className="mb-1 text-xs text-gray-500">{label}</p>
      <div
        className={`flex items-center justify-center overflow-hidden rounded border-2 border-du-green bg-gray-100 ${
          wide ? 'aspect-[1.586/1] w-60' : 'aspect-[3/4] w-32'
        }`}
      >
        {url && (
          <a href={url} target="_blank" rel="noreferrer" className="h-full w-full">
            <img src={url} alt="" className={`h-full w-full ${wide ? 'object-contain' : 'object-cover'}`} />
          </a>
        )}
        {!url && !failed && <span className="text-xs text-gray-400">Loading...</span>}
        {failed && <span className="px-2 text-center text-xs text-du-red">No photo</span>}
      </div>
    </div>
  )
}

function RequestCard({ r, onDone }) {
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const bucket = BUCKET[r.kind]
  const wide = r.kind === 'university_id'
  const oldPath = r.kind === 'profile' ? r.students?.photo_path : r.students?.university_id_photo_path

  async function approve() {
    setError('')
    setBusy(true)
    const { data: oldFile, error: e } = await supabase.rpc('approve_photo_change', { p_request: r.id })
    if (e) {
      setBusy(false)
      return setError(e.message)
    }
    // remove the file that was replaced
    if (oldFile && oldFile !== r.new_path) await supabase.storage.from(bucket).remove([oldFile])
    setBusy(false)
    onDone()
  }

  async function reject() {
    setError('')
    if (!reason.trim()) return setError('Please write the reason.')
    setBusy(true)
    const { data: newFile, error: e } = await supabase.rpc('reject_photo_change', {
      p_request: r.id,
      p_reason: reason.trim(),
    })
    if (e) {
      setBusy(false)
      return setError(e.message)
    }
    if (newFile) await supabase.storage.from(bucket).remove([newFile])
    setBusy(false)
    onDone()
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-bold text-du-green-dark">{r.students?.full_name}</span>
          <span className="text-sm text-gray-500"> · {r.students?.department || 'No department'}</span>
        </div>
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-du-blue">{LABEL[r.kind]}</span>
      </div>

      <div className="flex flex-wrap gap-6">
        <Photo bucket={bucket} path={oldPath} label="Current photo" wide={wide} />
        <Photo bucket={bucket} path={r.new_path} label="New photo (waiting)" wide={wide} />
      </div>
      <p className="mt-2 text-xs text-gray-400">Asked on {new Date(r.created_at).toLocaleString()}. Click a photo to open it larger.</p>

      {rejecting && (
        <div className="mt-3">
          <label className="mb-1 block text-sm text-gray-600">Reason (the student will see it)</label>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded border border-gray-300 bg-blue-50 px-3 py-2 text-sm focus:border-du-green focus:outline-none"
          />
        </div>
      )}
      {error && <p className="mt-2 text-sm text-du-red">{error}</p>}

      <div className="mt-3 flex flex-wrap gap-3">
        {!rejecting ? (
          <>
            <button
              disabled={busy}
              onClick={approve}
              className="rounded bg-du-green-dark px-4 py-2 text-sm font-semibold text-white hover:bg-du-green disabled:opacity-50"
            >
              {busy ? 'Working...' : 'Approve and replace'}
            </button>
            <button
              onClick={() => setRejecting(true)}
              className="rounded border border-du-red px-4 py-2 text-sm font-semibold text-du-red hover:bg-red-50"
            >
              Reject
            </button>
          </>
        ) : (
          <>
            <button
              disabled={busy}
              onClick={reject}
              className="rounded bg-du-red px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {busy ? 'Saving...' : 'Confirm rejection'}
            </button>
            <button
              onClick={() => {
                setRejecting(false)
                setError('')
              }}
              className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function PhotoChanges() {
  const [tab, setTab] = useState('pending')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const q = supabase
      .from('photo_change_requests')
      .select('*, students(full_name, department, photo_path, university_id_photo_path)')
      .order('created_at', { ascending: tab === 'pending' })
    const { data, error: e } = await (tab === 'pending' ? q.eq('status', 'pending') : q.neq('status', 'pending')).limit(100)
    setLoading(false)
    if (e) return setError(e.message)
    setError('')
    setRows(data)
  }, [tab])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {[
          ['pending', 'Waiting'],
          ['history', 'History'],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-1 text-sm font-semibold ${
              tab === key ? 'bg-du-green text-white' : 'border border-gray-300 bg-white text-gray-600 hover:border-du-green'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 text-sm text-du-red">{error}</p>}
      {loading && <p className="text-gray-400">Loading...</p>}
      {!loading && rows.length === 0 && (
        <p className="text-sm text-gray-400">
          {tab === 'pending' ? 'No photo changes are waiting.' : 'No handled requests yet.'}
        </p>
      )}

      {tab === 'pending' ? (
        <div className="space-y-4">
          {rows.map((r) => (
            <RequestCard key={r.id} r={r} onDone={load} />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white shadow">
          {rows.length > 0 && (
            <table className="w-full text-left text-sm">
              <thead className="bg-du-green/10 text-du-green-dark">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Photo</th>
                  <th className="px-4 py-3">Result</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-semibold">{r.students?.full_name}</td>
                    <td className="px-4 py-3">{LABEL[r.kind]}</td>
                    <td className="px-4 py-3">
                      {r.status === 'approved' ? (
                        <span className="font-semibold text-du-green-dark">Approved</span>
                      ) : (
                        <span className="text-du-red">Rejected{r.reason ? `: ${r.reason}` : ''}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{r.reviewed_at && new Date(r.reviewed_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}