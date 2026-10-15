import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { STAGES, stageLabel, stateLabel } from '../../lib/stages'

const inputCls =
  'w-full mb-4 rounded border border-gray-300 bg-blue-50 px-3 py-2 focus:outline-none focus:border-du-green'

function Responses({ request, onClose }) {
  const [rows, setRows] = useState(undefined)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      supabase
        .from('status_request_recipients')
        .select('student_id, students(full_name, department)')
        .eq('request_id', request.id),
      supabase.from('status_submissions').select('*').eq('request_id', request.id),
    ]).then(([r, s]) => {
      const err = r.error || s.error
      if (err) return setError(err.message)
      const byStudent = new Map(s.data.map((x) => [x.student_id, x]))
      const merged = r.data
        .map((x) => ({ ...x, sub: byStudent.get(x.student_id) ?? null }))
        .sort((a, b) => a.students.full_name.localeCompare(b.students.full_name))
      setRows(merged)
    })
  }, [request.id])

  const answered = rows ? rows.filter((r) => r.sub).length : 0
  const counts = STAGES.map((st) => ({
    ...st,
    n: rows ? rows.filter((r) => r.sub?.stage === st.key).length : 0,
  }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between bg-du-green px-5 py-3 text-white">
          <h2 className="font-bold">{request.title}</h2>
          <button onClick={onClose} className="text-2xl leading-none hover:text-du-gold">×</button>
        </div>

        <div className="p-5">
          {error && <p className="text-sm text-du-red">{error}</p>}
          {rows === undefined && !error && <p className="text-gray-400">Loading...</p>}

          {rows && (
            <>
              <p className="mb-3 text-sm text-gray-600">
                <b>{answered}</b> of <b>{rows.length}</b> students have responded
                {request.deadline && ` · deadline ${new Date(request.deadline).toLocaleString()}`}
              </p>

              <div className="mb-4 flex flex-wrap gap-2">
                {counts.map((c) => (
                  <span key={c.key} className="rounded-full bg-du-blue/10 px-3 py-1 text-xs font-semibold text-du-blue">
                    {c.label}: {c.n}
                  </span>
                ))}
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-du-red">
                  Not yet: {rows.length - answered}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-du-green/10 text-du-green-dark">
                    <tr>
                      <th className="px-3 py-2">Student</th>
                      <th className="px-3 py-2">Stage</th>
                      <th className="px-3 py-2">State</th>
                      <th className="px-3 py-2">Note</th>
                      <th className="px-3 py-2">Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 && (
                      <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">No students received this request.</td></tr>
                    )}
                    {rows.map((r) => (
                      <tr key={r.student_id} className="border-t border-gray-100 align-top">
                        <td className="px-3 py-2">
                          <div className="font-semibold">{r.students.full_name}</div>
                          <div className="text-xs text-gray-500">{r.students.department}</div>
                        </td>
                        {r.sub ? (
                          <>
                            <td className="px-3 py-2">{stageLabel(r.sub.stage)}</td>
                            <td className="px-3 py-2">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                r.sub.state === 'finished' ? 'bg-green-100 text-du-green-dark' : 'bg-yellow-100 text-yellow-800'}`}>
                                {stateLabel(r.sub.state)}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-gray-600">
                              {r.sub.note}
                              {r.sub.link && (
                                <div>
                                  <a href={r.sub.link} target="_blank" rel="noreferrer" className="text-du-blue underline">
                                    Link
                                  </a>
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-500">
                              {new Date(r.sub.updated_at).toLocaleString()}
                            </td>
                          </>
                        ) : (
                          <td colSpan={4} className="px-3 py-2 font-semibold text-du-red">Not yet submitted</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function StatusRequests() {
  const [requests, setRequests] = useState([])
  const [recipientCount, setRecipientCount] = useState({})
  const [answerCount, setAnswerCount] = useState({})
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [viewing, setViewing] = useState(null)

  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [deadline, setDeadline] = useState('')
  const [mode, setMode] = useState('all')
  const [chosen, setChosen] = useState(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    const [rq, rc, sb, st] = await Promise.all([
      supabase.from('status_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('status_request_recipients').select('request_id'),
      supabase.from('status_submissions').select('request_id'),
      supabase.from('students').select('id, full_name, department').eq('status', 'active').order('full_name'),
    ])
    const err = rq.error || rc.error || sb.error || st.error
    if (err) setListError(err.message)
    else {
      setListError('')
      setRequests(rq.data)
      const count = (rows) =>
        rows.reduce((acc, r) => ({ ...acc, [r.request_id]: (acc[r.request_id] ?? 0) + 1 }), {})
      setRecipientCount(count(rc.data))
      setAnswerCount(count(sb.data))
      setStudents(st.data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function toggle(id) {
    const next = new Set(chosen)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setChosen(next)
  }

  async function create(e) {
    e.preventDefault()
    setError('')
    setNotice('')
    if (mode === 'some' && chosen.size === 0) return setError('Please choose at least one student.')
    if (mode === 'all' && students.length === 0) return setError('There are no active students yet.')

    setBusy(true)
    const { error: err } = await supabase.rpc('create_status_request', {
      p_title: title.trim(),
      p_note: note.trim() || null,
      p_deadline: deadline ? new Date(deadline).toISOString() : null,
      p_student_ids: mode === 'all' ? null : [...chosen],
    })
    setBusy(false)
    if (err) return setError(err.message)

    setNotice('Request sent ✔ Students will see it on their dashboard.')
    setTitle('')
    setNote('')
    setDeadline('')
    setMode('all')
    setChosen(new Set())
    load()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <form onSubmit={create} className="h-fit rounded-lg border-t-4 border-du-green bg-white p-5 shadow">
        <h2 className="mb-4 text-lg font-bold text-du-green-dark">Ask students for a project update</h2>

        <label className="mb-1 block text-sm text-gray-600">Title</label>
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. October project update" maxLength={150} required />

        <label className="mb-1 block text-sm text-gray-600">Note for students (optional)</label>
        <textarea className={inputCls} rows={3} value={note} onChange={(e) => setNote(e.target.value)} />

        <label className="mb-1 block text-sm text-gray-600">Deadline (optional)</label>
        <input className={inputCls} type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />

        <p className="mb-1 text-sm text-gray-600">Send to</p>
        <div className="mb-3 flex gap-4 text-sm">
          <label className="flex items-center gap-1">
            <input type="radio" checked={mode === 'all'} onChange={() => setMode('all')} />
            All active students ({students.length})
          </label>
          <label className="flex items-center gap-1">
            <input type="radio" checked={mode === 'some'} onChange={() => setMode('some')} />
            Choose students
          </label>
        </div>

        {mode === 'some' && (
          <div className="mb-4 max-h-48 overflow-y-auto rounded border border-gray-200 p-2">
            {students.map((s) => (
              <label key={s.id} className="flex items-center gap-2 py-1 text-sm">
                <input type="checkbox" checked={chosen.has(s.id)} onChange={() => toggle(s.id)} />
                {s.full_name} <span className="text-xs text-gray-400">{s.department}</span>
              </label>
            ))}
          </div>
        )}

        {error && <p className="mb-3 text-sm text-du-red">{error}</p>}
        {notice && <p className="mb-3 text-sm text-du-green-dark">{notice}</p>}

        <button disabled={busy}
          className="w-full rounded bg-du-green-dark py-2 font-semibold text-white hover:bg-du-green disabled:opacity-60">
          {busy ? 'Sending...' : 'Send request'}
        </button>
      </form>

      <div>
        <h2 className="mb-3 text-lg font-bold text-du-green-dark">Requests sent</h2>
        {listError && <p className="mb-3 text-sm text-du-red">{listError}</p>}
        {loading && <p className="text-gray-400">Loading...</p>}
        {!loading && requests.length === 0 && <p className="text-gray-400">No requests yet.</p>}

        <div className="space-y-3">
          {requests.map((r) => {
            const total = recipientCount[r.id] ?? 0
            const done = answerCount[r.id] ?? 0
            const pct = total ? Math.round((done / total) * 100) : 0
            const closed = r.deadline && new Date(r.deadline) < new Date()
            return (
              <div key={r.id} className="rounded-lg bg-white p-4 shadow">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold text-du-green-dark">{r.title}</h3>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    closed ? 'bg-gray-200 text-gray-600' : 'bg-green-100 text-du-green-dark'}`}>
                    {closed ? 'Closed' : 'Open'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Sent {new Date(r.created_at).toLocaleDateString()}
                  {r.deadline && ` · deadline ${new Date(r.deadline).toLocaleString()}`}
                </p>
                {r.note && <p className="mt-2 text-sm text-gray-700">{r.note}</p>}

                <div className="mt-3 h-2 overflow-hidden rounded bg-gray-200">
                  <div className="h-full bg-du-green" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-gray-600">{done} of {total} responded</span>
                  <button onClick={() => setViewing(r)} className="font-semibold text-du-blue hover:underline">
                    View responses
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {viewing && <Responses request={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}