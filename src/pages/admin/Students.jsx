import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { exportStudents } from '../../lib/exportStudents'

const fullId = (s) =>
  s.id_number ? `DUIC-${s.id_number}/${String(s.id_year % 100).padStart(2, '0')}` : '—'

const currentRoom = (s) => {
  const a = (s.room_assignments ?? []).find((x) => x.ended_at === null)
  return a ? `${a.rooms.building} · ${a.rooms.room_number}` : '—'
}

function StudentModal({ student, onClose, onChanged }) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [creds, setCreds] = useState(null)
  const [copied, setCopied] = useState(false)
  const [deactivated, setDeactivated] = useState(false)
  const [reactivated, setReactivated] = useState(false)
  const [titles, setTitles] = useState([])
  const [log, setLog] = useState([])

  const isActive = ['approved', 'active'].includes(student.status)

  useEffect(() => {
    supabase
      .from('project_titles')
      .select('id, title, created_at')
      .eq('student_id', student.id)
      .order('created_at')
      .then(({ data }) => setTitles(data ?? []))
    supabase
      .from('student_status_log')
      .select('id, action, reason, done_at')
      .eq('student_id', student.id)
      .order('done_at', { ascending: false })
      .then(({ data }) => setLog(data ?? []))
  }, [student.id])

  async function resetPassword() {
    if (!window.confirm(`Reset the password of ${student.full_name}? The old password will stop working.`)) return
    setError('')
    setBusy(true)
    const { data, error: e } = await supabase.functions.invoke('reset-password', {
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

  async function copy() {
    const text =
      `Dilla University Incubation Center\n` +
      `Name: ${student.full_name}\n` +
      `Username: ${student.username}\n` +
      `New temporary password: ${creds.tempPassword}\n` +
      `Login: ${window.location.origin}\n` +
      `You must change your password at your next login.`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function deactivate() {
    setError('')
    if (!reason.trim()) return setError('Please write the reason (for example: graduated).')
    if (!window.confirm(
      `Deactivate ${student.full_name}?\n\nThe room will be freed, the ID will be voided, and the login will be blocked. You can bring the student back later with Reactivate.`
    )) return
    setBusy(true)
    const { error: e } = await supabase.rpc('deactivate_student', {
      p_student: student.id,
      p_reason: reason.trim(),
    })
    setBusy(false)
    if (e) return setError(e.message)
    setDeactivated(true)
  }

  async function reactivate() {
    setError('')
    if (!window.confirm(
      `Bring ${student.full_name} back?\n\nTheir login and incubation ID will work again. They will not have a room until you assign one.`
    )) return
    setBusy(true)
    const { error: e } = await supabase.rpc('reactivate_student', {
      p_student: student.id,
      p_reason: reason.trim() || null,
    })
    setBusy(false)
    if (e) return setError(e.message)
    setReactivated(true)
  }

  const row = (label, value) => (
    <div className="flex justify-between gap-4 border-b border-gray-100 py-2 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-semibold">{value || '—'}</span>
    </div>
  )

  const finished = deactivated || reactivated || creds

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between bg-du-green px-5 py-3 text-white">
          <h2 className="font-bold">{student.full_name}</h2>
          {!finished && (
            <button onClick={onClose} className="text-2xl leading-none hover:text-du-gold">×</button>
          )}
        </div>

        {reactivated ? (
          <div className="p-8 text-center">
            <h3 className="mb-2 text-xl font-bold text-du-green-dark">Student reactivated ✔</h3>
            <p className="text-sm text-gray-600">
              The login and the incubation ID work again, with the same password as before.
              If the student forgot it, use Reset password. Assign a room in the Rooms tab.
            </p>
            <button onClick={onChanged}
              className="mt-5 rounded bg-du-green-dark px-6 py-2 font-semibold text-white hover:bg-du-green">
              Done
            </button>
          </div>
        ) : deactivated ? (
          <div className="p-8 text-center">
            <h3 className="mb-2 text-xl font-bold text-du-green-dark">Student deactivated ✔</h3>
            <p className="text-sm text-gray-600">
              The room is freed, the ID is voided, and the login is blocked. All history is kept.
            </p>
            <button onClick={onChanged}
              className="mt-5 rounded bg-du-green-dark px-6 py-2 font-semibold text-white hover:bg-du-green">
              Done
            </button>
          </div>
        ) : creds ? (
          <div className="p-6">
            <h3 className="mb-1 text-xl font-bold text-du-green-dark">Password reset ✔</h3>
            <p className="mb-4 text-sm text-du-red">
              Copy this now. The password is shown only this one time.
            </p>
            <div className="space-y-2 rounded-lg border-2 border-du-green bg-green-50 p-4 text-sm">
              <div><span className="text-gray-500">Username: </span><b className="font-mono text-base">{student.username}</b></div>
              <div><span className="text-gray-500">New temporary password: </span><b className="font-mono text-base">{creds.tempPassword}</b></div>
            </div>
                        {creds.telegram === 'sent' && (
              <p className="mt-3 rounded bg-green-100 px-3 py-2 text-sm font-semibold text-du-green-dark">
                ✔ The new password was also sent to the student on Telegram.
              </p>
            )}
            {creds.telegram === 'failed' && (
              <p className="mt-3 rounded bg-red-100 px-3 py-2 text-sm font-semibold text-du-red">
                Telegram sending failed. Give the student the password by hand.
              </p>
            )}
            {creds.telegram === 'not_linked' && (
              <p className="mt-3 rounded bg-yellow-100 px-3 py-2 text-sm font-semibold text-yellow-800">
                The student has not linked Telegram. Give the student the password by hand.
              </p>
            )}
            <div className="mt-4 flex gap-3">
              <button onClick={copy}
                className="rounded bg-du-green-dark px-4 py-2 font-semibold text-white hover:bg-du-green">
                {copied ? 'Copied ✔' : 'Copy login details'}
              </button>
              <button onClick={onClose}
                className="rounded border border-gray-300 px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50">
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5">
            {row('Incubation ID', fullId(student))}
            {row('Username', student.username)}
            {row('Department', student.department)}
            {row('University ID', student.university_id)}
            {row('Phone', student.phone)}
            {row('Current room', currentRoom(student))}
            {row('Profile', student.profile_status)}
            {!isActive && row('Deactivated on', student.deactivated_at && new Date(student.deactivated_at).toLocaleDateString())}
            {!isActive && row('Reason', student.deactivation_reason)}

            <div className="mt-3">
              <p className="mb-1 text-sm text-gray-500">Project titles</p>
              {(student.proposed_titles?.length ?? 0) + titles.length === 0 ? (
                <p className="text-sm text-gray-400">None.</p>
              ) : (
                <ul className="list-disc space-y-1 pl-5 text-sm font-semibold">
                  {(student.proposed_titles ?? []).map((t, i) => (
                    <li key={`r${i}`}>
                      {t} <span className="text-xs font-normal text-gray-400">(registration)</span>
                    </li>
                  ))}
                  {titles.map((t) => (
                    <li key={t.id}>
                      {t.title}{' '}
                      <span className="text-xs font-normal text-gray-400">
                        ({new Date(t.created_at).toLocaleDateString()})
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {log.length > 0 && (
              <div className="mt-3">
                <p className="mb-1 text-sm text-gray-500">History</p>
                <ul className="space-y-1 text-sm">
                  {log.map((l) => (
                    <li key={l.id}>
                      <span className={`font-semibold ${l.action === 'reactivated' ? 'text-du-green-dark' : 'text-du-red'}`}>
                        {l.action === 'reactivated' ? 'Reactivated' : 'Deactivated'}
                      </span>{' '}
                      on {new Date(l.done_at).toLocaleDateString()}
                      {l.reason && `: ${l.reason}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {isActive && (
              <div className="mt-5 space-y-5">
                <div>
                  <p className="mb-2 text-sm text-gray-600">Forgot their password?</p>
                  <button disabled={busy} onClick={resetPassword}
                    className="rounded border border-du-blue px-4 py-2 text-sm font-semibold text-du-blue hover:bg-blue-50 disabled:opacity-50">
                    {busy ? 'Working...' : 'Reset password'}
                  </button>
                </div>

                <div className="rounded-lg border border-du-red/40 bg-red-50 p-4">
                  <p className="mb-2 text-sm font-bold text-du-red">Deactivate student (graduated or left)</p>
                  <label className="mb-1 block text-sm text-gray-600">Reason</label>
                  <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)}
                    className="mb-3 w-full rounded border border-gray-300 bg-white px-3 py-2 focus:border-du-red focus:outline-none" />
                  <button disabled={busy} onClick={deactivate}
                    className="rounded bg-du-red px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
                    Deactivate
                  </button>
                </div>
              </div>
            )}

            {!isActive && (
              <div className="mt-5 rounded-lg border border-du-green/40 bg-green-50 p-4">
                <p className="mb-1 text-sm font-bold text-du-green-dark">Bring this student back</p>
                <p className="mb-3 text-xs text-gray-600">
                  Use this if the student was deactivated by mistake or returns to the center.
                  The login and the incubation ID work again. The student needs a new room.
                </p>
                <label className="mb-1 block text-sm text-gray-600">Note (optional)</label>
                <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. deactivated by mistake"
                  className="mb-3 w-full rounded border border-gray-300 bg-white px-3 py-2 focus:border-du-green focus:outline-none" />
                <button disabled={busy} onClick={reactivate}
                  className="rounded bg-du-green-dark px-4 py-2 text-sm font-semibold text-white hover:bg-du-green disabled:opacity-50">
                  {busy ? 'Working...' : 'Reactivate'}
                </button>
              </div>
            )}

            {error && <p className="mt-4 text-sm text-du-red">{error}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Students() {
  const [tab, setTab] = useState('active')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [exporting, setExporting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const statuses = tab === 'active' ? ['approved', 'active'] : ['deactivated']
    const { data, error: e } = await supabase
      .from('students')
      .select(
        'id, full_name, department, username, university_id, phone, status, profile_status, proposed_titles, ' +
        'id_number, id_year, deactivated_at, deactivation_reason, ' +
        'room_assignments(ended_at, rooms(building, room_number))'
      )
      .in('status', statuses)
      .order('full_name')
    setLoading(false)
    if (e) return setError(e.message)
    setRows(data)
  }, [tab])

  useEffect(() => {
    load()
  }, [load])

  async function doExport() {
    setError('')
    setExporting(true)
    try {
      const n = await exportStudents(
        tab === 'active'
          ? { statuses: ['approved', 'active'], title: 'Active students', fileLabel: 'active-students' }
          : { statuses: ['deactivated'], title: 'Deactivated students', fileLabel: 'deactivated-students' }
      )
      if (n === 0) setError('There are no students to export.')
    } catch (e) {
      setError(`Export failed: ${e.message}`)
    } finally {
      setExporting(false)
    }
  }

  const q = search.trim().toLowerCase()
  const shown = rows.filter(
    (r) =>
      !q ||
      r.full_name?.toLowerCase().includes(q) ||
      r.username?.toLowerCase().includes(q) ||
      r.university_id?.toLowerCase().includes(q) ||
      fullId(r).toLowerCase().includes(q)
  )

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {[
          ['active', 'Active students'],
          ['deactivated', 'Deactivated'],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-1 text-sm font-semibold ${
              tab === key
                ? 'bg-du-green text-white'
                : 'border border-gray-300 bg-white text-gray-600 hover:border-du-green'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={doExport}
          disabled={exporting}
          className="rounded-full border border-du-green-dark px-4 py-1 text-sm font-semibold text-du-green-dark hover:bg-green-50 disabled:opacity-60"
        >
          {exporting ? 'Preparing...' : '⬇ Export to Excel'}
        </button>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, username, or ID"
          className="ml-auto w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-du-green focus:outline-none sm:w-64"
        />
      </div>

      {error && <p className="mb-3 text-sm text-du-red">{error}</p>}

      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="w-full text-left text-sm">
          <thead className="bg-du-green/10 text-du-green-dark">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Incubation ID</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">{tab === 'active' ? 'Room' : 'Deactivated'}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>}
            {!loading && shown.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No students found.</td></tr>
            )}
            {shown.map((r) => (
              <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold">{r.full_name}</td>
                <td className="px-4 py-3 font-mono">{fullId(r)}</td>
                <td className="px-4 py-3">{r.department || '—'}</td>
                <td className="px-4 py-3">
                  {tab === 'active'
                    ? currentRoom(r)
                    : r.deactivated_at && new Date(r.deactivated_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setSelected(r)}
                    className="rounded bg-du-green-dark px-3 py-1 text-white hover:bg-du-green">
                    {tab === 'active' ? 'Manage' : 'View'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <StudentModal
          student={selected}
          onClose={() => setSelected(null)}
          onChanged={() => {
            setSelected(null)
            load()
          }}
        />
      )}
    </div>
  )
}