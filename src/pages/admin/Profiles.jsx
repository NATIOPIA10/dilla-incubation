import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { yearOfStudyLabel } from '../../lib/years'

const TABS = [
  { key: 'submitted', label: 'Waiting for review' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
]

const fullId = (s) =>
  s.id_number ? `DUIC-${s.id_number}/${String(s.id_year % 100).padStart(2, '0')}` : '—'

function ProfileModal({ student, onClose, onDone }) {
  const [photoUrl, setPhotoUrl] = useState(null)
  const [photoError, setPhotoError] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [issuedId, setIssuedId] = useState(null)

  const reviewable = student.profile_status === 'submitted'

  useEffect(() => {
    if (!student.photo_path) return setPhotoError(true)
    supabase.storage
      .from('profile-photos')
      .createSignedUrl(student.photo_path, 300)
      .then(({ data, error: e }) => {
        if (e || !data) setPhotoError(true)
        else setPhotoUrl(data.signedUrl)
      })
  }, [student.photo_path])

  async function approve() {
    if (!window.confirm('Approve this profile and release the ID card?')) return
    setError('')
    setBusy(true)
    const { data, error: e } = await supabase.rpc('approve_profile', { p_student: student.id })
    setBusy(false)
    if (e) return setError(e.message)
    setIssuedId(data)
  }

  async function reject() {
    setError('')
    if (!reason.trim()) return setError('Please write the reason for rejection.')
    setBusy(true)
    const { error: e } = await supabase.rpc('reject_profile', {
      p_student: student.id,
      p_reason: reason.trim(),
    })
    setBusy(false)
    if (e) return setError(e.message)
    onDone()
  }

  const row = (label, value) => (
    <div className="flex justify-between gap-4 border-b border-gray-100 py-2 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-right">{value || '—'}</span>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between bg-du-green px-5 py-3 text-white">
          <h2 className="font-bold">Review profile</h2>
          {!issuedId && (
            <button onClick={onClose} className="text-2xl leading-none hover:text-du-gold">×</button>
          )}
        </div>

        {issuedId ? (
          <div className="p-8 text-center">
            <h3 className="text-xl font-bold text-du-green-dark mb-2">Profile approved ✔</h3>
            <p className="text-gray-500">ID card released to {student.full_name}:</p>
            <p className="my-4 text-4xl font-mono font-bold text-du-green-dark">{issuedId}</p>
            <button onClick={onDone} className="rounded bg-du-green-dark px-6 py-2 font-semibold text-white hover:bg-du-green">
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-6 p-5 md:grid-cols-[180px_1fr]">
              <div>
                <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded border-2 border-du-green bg-gray-100">
                  {photoUrl && <img src={photoUrl} alt="Student" className="h-full w-full object-cover" />}
                  {!photoUrl && !photoError && <span className="text-sm text-gray-400">Loading...</span>}
                  {photoError && <span className="px-2 text-center text-xs text-du-red">No photo</span>}
                </div>
              </div>
              <div>
                {row('Full name', student.full_name)}
                {row('Gender', student.gender)}
                {row('Department', student.department)}
                {row('Year of study', yearOfStudyLabel(student.year_of_study))}
                {row('University ID', student.university_id)}
                {row('Phone', student.phone)}
                {row('Emergency contact', student.emergency_contact_name)}
                {row('Emergency phone', student.emergency_contact_phone)}
                {row('Username', student.username)}
                {student.profile_status === 'approved' && row('Incubation ID', fullId(student))}
                {student.profile_rejection_reason && row('Rejection reason', student.profile_rejection_reason)}
              </div>
            </div>

            {reviewable && (
              <div className="border-t border-gray-200 p-5">
                {rejecting && (
                  <div className="mb-4">
                    <label className="mb-1 block text-sm text-gray-600">
                      Reason for rejection (the student will see this and can fix the profile)
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={3}
                      className="w-full rounded border border-gray-300 bg-blue-50 px-3 py-2 focus:border-du-green focus:outline-none"
                    />
                  </div>
                )}
                {error && <p className="mb-3 text-sm text-du-red">{error}</p>}
                <div className="flex flex-wrap gap-3">
                  {!rejecting ? (
                    <>
                      <button
                        disabled={busy}
                        onClick={approve}
                        className="rounded bg-du-green-dark px-4 py-2 font-semibold text-white hover:bg-du-green disabled:opacity-50"
                      >
                        {busy ? 'Working...' : 'Approve profile and release ID card'}
                      </button>
                      <button
                        onClick={() => setRejecting(true)}
                        className="rounded border border-du-red px-4 py-2 font-semibold text-du-red hover:bg-red-50"
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        disabled={busy}
                        onClick={reject}
                        className="rounded bg-du-red px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
                      >
                        {busy ? 'Saving...' : 'Confirm rejection'}
                      </button>
                      <button
                        onClick={() => { setRejecting(false); setError('') }}
                        className="rounded border border-gray-300 px-4 py-2 text-gray-600 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function Profiles() {
  const [tab, setTab] = useState('submitted')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error: e } = await supabase
      .from('students')
      .select(
        'id, full_name, gender, department, year_of_study, university_id, phone, username, ' +
        'emergency_contact_name, emergency_contact_phone, photo_path, profile_status, ' +
        'profile_rejection_reason, id_number, id_year, created_at'
      )
      .eq('profile_status', tab)
      .order('created_at', { ascending: true })
    setLoading(false)
    if (e) return setError(e.message)
    setRows(data)
  }, [tab])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-1 text-sm font-semibold ${
              tab === t.key
                ? 'bg-du-green text-white'
                : 'border border-gray-300 bg-white text-gray-600 hover:border-du-green'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 text-sm text-du-red">{error}</p>}

      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="w-full text-left text-sm">
          <thead className="bg-du-green/10 text-du-green-dark">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">University ID</th>
              <th className="px-4 py-3">{tab === 'approved' ? 'Incubation ID' : 'Username'}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No profiles here.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold">{r.full_name}</td>
                <td className="px-4 py-3">{r.department}</td>
                <td className="px-4 py-3">{r.university_id}</td>
                <td className="px-4 py-3 font-mono">{tab === 'approved' ? fullId(r) : r.username}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setSelected(r)}
                    className="rounded bg-du-green-dark px-3 py-1 text-white hover:bg-du-green"
                  >
                    {r.profile_status === 'submitted' ? 'Review' : 'View'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <ProfileModal
          student={selected}
          onClose={() => setSelected(null)}
          onDone={() => {
            setSelected(null)
            load()
          }}
        />
      )}
    </div>
  )
}
