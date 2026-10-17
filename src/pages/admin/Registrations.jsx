import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const TABS = [
  { key: 'pending', label: 'Pending', statuses: ['pending'] },
  { key: 'waitlisted', label: 'Waitlisted', statuses: ['waitlisted'] },
  { key: 'rejected', label: 'Rejected', statuses: ['rejected'] },
  { key: 'approved', label: 'Approved', statuses: ['approved', 'active'] },
]

const YEARS = { 2: '2nd year', 3: '3rd year', 4: '4th year', 5: '5th year' }
const yearText = (n) => YEARS[n] ?? String(n)

function TelegramStatus({ status }) {
  if (status === 'sent') {
    return (
      <p className="mt-3 rounded bg-green-100 px-3 py-2 text-sm font-semibold text-du-green-dark">
        ✔ The login was also sent to the student on Telegram.
      </p>
    )
  }
  if (status === 'failed') {
    return (
      <p className="mt-3 rounded bg-red-100 px-3 py-2 text-sm font-semibold text-du-red">
        Telegram sending failed. Give the student the login by hand.
      </p>
    )
  }
  if (status === 'not_linked') {
    return (
      <p className="mt-3 rounded bg-yellow-100 px-3 py-2 text-sm font-semibold text-yellow-800">
        The student has not linked Telegram. Give the student the login by hand.
      </p>
    )
  }
  return null
}

function Credentials({ student, creds, onClose }) {
  const [copied, setCopied] = useState(false)

  const message =
    `Dilla University Incubation Center\n` +
    `Name: ${student.full_name}\n` +
    `Username: ${creds.username}\n` +
    `Temporary password: ${creds.tempPassword}\n` +
    `Login: ${window.location.origin}\n` +
    `You must change your password at your first login.`

  async function copy() {
    await navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-6">
      <h3 className="text-xl font-bold text-du-green-dark mb-1">Student approved ✔</h3>
      <p className="mb-4 text-sm text-du-red">
        Copy these now. The password is shown only this one time. If it is lost, use Reset password.
      </p>
      <div className="rounded-lg border-2 border-du-green bg-green-50 p-4 text-sm space-y-2">
        <div><span className="text-gray-500">Name: </span><b>{student.full_name}</b></div>
        <div><span className="text-gray-500">Username: </span><b className="font-mono text-base">{creds.username}</b></div>
        <div><span className="text-gray-500">Temporary password: </span><b className="font-mono text-base">{creds.tempPassword}</b></div>
      </div>
      <TelegramStatus status={creds.telegram} />
      <div className="mt-4 flex gap-3">
        <button onClick={copy} className="rounded bg-du-green-dark px-4 py-2 font-semibold text-white hover:bg-du-green">
          {copied ? 'Copied ✔' : 'Copy login details'}
        </button>
        <button onClick={onClose} className="rounded border border-gray-300 px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50">
          Done
        </button>
      </div>
    </div>
  )
}

function ReviewModal({ student, onClose, onDone }) {
  const [photoUrl, setPhotoUrl] = useState(null)
  const [photoError, setPhotoError] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [creds, setCreds] = useState(null)

  const reviewable = ['pending', 'waitlisted'].includes(student.status)

  useEffect(() => {
    supabase.storage
      .from('registration-ids')
      .createSignedUrl(student.university_id_photo_path, 300)
      .then(({ data, error: e }) => {
        if (e || !data) setPhotoError(true)
        else setPhotoUrl(data.signedUrl)
      })
  }, [student.university_id_photo_path])

  async function approve() {
    setError('')
    setBusy(true)
    const { data, error: e } = await supabase.functions.invoke('approve-student', {
      body: { studentId: student.id, siteUrl: window.location.origin },
    })
    setBusy(false)
    if (e) {
      let msg = e.message
      try {
        const body = await e.context.json()
        if (body?.error) msg = body.error
      } catch { /* keep the generic message */ }
      return setError(msg)
    }
    setCreds(data)
  }

  async function decide(decision) {
    setError('')
    if (decision === 'rejected' && !reason.trim()) {
      return setError('Please write the reason for rejection.')
    }
    setBusy(true)
    const { error: e } = await supabase.rpc('review_registration', {
      p_student: student.id,
      p_decision: decision,
      p_reason: decision === 'rejected' ? reason.trim() : null,
    })
    setBusy(false)
    if (e) return setError(e.message)
    onDone()
  }

  const row = (label, value) => (
    <div className="flex justify-between gap-4 border-b border-gray-100 py-2 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-right">{value}</span>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between bg-du-green px-5 py-3 text-white">
          <h2 className="font-bold">Review registration</h2>
          {!creds && (
            <button onClick={onClose} className="text-2xl leading-none hover:text-du-gold">×</button>
          )}
        </div>

        {creds ? (
          <Credentials student={student} creds={creds} onClose={onDone} />
        ) : (
          <>
            <div className="grid gap-6 p-5 md:grid-cols-2">
              <div>
                {row('Full name', student.full_name)}
                {row('University ID', student.university_id)}
                {row('Phone', student.phone)}
                {row('Year of study', yearText(student.year_of_study))}
                {row('Registered', new Date(student.created_at).toLocaleString())}
                {row('Status', student.status)}
                {reviewable && row('Telegram', student.telegramLinked ? '✔ Linked' : 'Not linked')}
                {student.rejection_reason && row('Reason', student.rejection_reason)}

                <div className="mt-3">
                  <p className="mb-1 text-sm text-gray-500">Proposed project titles</p>
                  {student.proposed_titles?.length ? (
                    <ol className="list-decimal space-y-1 pl-5 text-sm font-semibold">
                      {student.proposed_titles.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-sm text-gray-400">None (registered before this rule)</p>
                  )}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm text-gray-500">Photo of university ID</p>
                <div className="flex aspect-[1.586/1] items-center justify-center overflow-hidden rounded border-2 border-du-green bg-gray-100">
                  {photoUrl && (
                    <a href={photoUrl} target="_blank" rel="noreferrer" className="h-full w-full">
                      <img src={photoUrl} alt="University ID" className="h-full w-full object-contain" />
                    </a>
                  )}
                  {!photoUrl && !photoError && <span className="text-sm text-gray-400">Loading photo...</span>}
                  {photoError && <span className="px-4 text-center text-sm text-du-red">Could not load the ID photo.</span>}
                </div>
                <p className="mt-1 text-xs text-gray-500">Click the photo to open it full size.</p>
              </div>
            </div>

            {reviewable && (
              <div className="border-t border-gray-200 p-5">
                {rejecting && (
                  <div className="mb-4">
                    <label className="mb-1 block text-sm text-gray-600">Reason for rejection</label>
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
                  {!rejecting && (
                    <button
                      disabled={busy}
                      onClick={approve}
                      className="rounded bg-du-green-dark px-4 py-2 font-semibold text-white hover:bg-du-green disabled:opacity-50"
                    >
                      {busy ? 'Working...' : 'Approve'}
                    </button>
                  )}

                  {student.status === 'pending' && !rejecting && (
                    <button
                      disabled={busy}
                      onClick={() => decide('waitlisted')}
                      className="rounded border border-du-blue px-4 py-2 font-semibold text-du-blue hover:bg-blue-50 disabled:opacity-50"
                    >
                      Waitlist
                    </button>
                  )}

                  {!rejecting ? (
                    <button
                      onClick={() => setRejecting(true)}
                      className="rounded border border-du-red px-4 py-2 font-semibold text-du-red hover:bg-red-50"
                    >
                      Reject
                    </button>
                  ) : (
                    <>
                      <button
                        disabled={busy}
                        onClick={() => decide('rejected')}
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

export default function Registrations() {
  const [tab, setTab] = useState('pending')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const statuses = TABS.find((t) => t.key === tab).statuses
    const { data, error: e } = await supabase
      .from('students')
      .select(
        'id, full_name, university_id, phone, year_of_study, status, rejection_reason, ' +
        'university_id_photo_path, created_at, username, proposed_titles, telegram_links(linked_at)'
      )
      .in('status', statuses)
      .order('created_at', { ascending: true })
    setLoading(false)
    if (e) return setError(e.message)
    setRows(
      data.map((r) => {
        const link = Array.isArray(r.telegram_links) ? r.telegram_links[0] : r.telegram_links
        return { ...r, telegramLinked: !!link?.linked_at }
      })
    )
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
              <th className="px-4 py-3">University ID</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Year</th>
              <th className="px-4 py-3">Telegram</th>
              <th className="px-4 py-3">{tab === 'approved' ? 'Username' : 'Registered'}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No registrations here.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold">{r.full_name}</td>
                <td className="px-4 py-3">{r.university_id}</td>
                <td className="px-4 py-3">{r.phone}</td>
                <td className="px-4 py-3">{yearText(r.year_of_study)}</td>
                <td className="px-4 py-3">
                  {r.telegramLinked ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-du-green-dark">Linked ✔</span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Not linked</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {tab === 'approved' ? r.username : new Date(r.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setSelected(r)}
                    className="rounded bg-du-green-dark px-3 py-1 text-white hover:bg-du-green"
                  >
                    {['pending', 'waitlisted'].includes(r.status) ? 'Review' : 'View'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <ReviewModal
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