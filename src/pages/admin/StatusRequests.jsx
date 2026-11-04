import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { STAGES, stageLabel, stateLabel } from '../../lib/stages'
import { studentProgress } from '../../lib/statusProgress'

const inputCls =
  'w-full mb-4 rounded border border-gray-300 bg-blue-50 px-3 py-2 focus:outline-none focus:border-du-green'

function ProgressBadge({ p }) {
  if (p.complete) {
    return (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-du-green-dark">
        Complete · {p.done} of {p.needed}
      </span>
    )
  }
  if (p.partial) {
    return (
      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800">
        Incomplete · {p.done} of {p.needed}
      </span>
    )
  }
  return (
    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-du-red">
      Not yet · 0 of {p.needed}
    </span>
  )
}

function Responses({ request, onClose }) {
  const [data, setData] = useState(undefined)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      supabase
        .from('status_request_recipients')
        .select('student_id, students(full_name, department)')
        .eq('request_id', request.id),
      supabase.from('status_submissions').select('*').eq('request_id', request.id),
    ]).then(async ([r, s]) => {
      const err = r.error || s.error
      if (err) return setError(err.message)

      const ids = r.data.map((x) => x.student_id)
      let ti = []
      if (ids.length) {
        const res = await supabase
          .from('project_titles')
          .select('id, title, student_id, created_at')
          .in('student_id', ids)
          .order('created_at')
        if (res.error) return setError(res.error.message)
        ti = res.data
      }

      const rows = r.data
        .map((rec) => {
          const st = Array.isArray(rec.students) ? rec.students[0] : rec.students
          const myTitles = ti.filter((t) => t.student_id === rec.student_id)
          const mySubs = s.data.filter((x) => x.student_id === rec.student_id)
          const progress = studentProgress(myTitles, mySubs)

          const lines = myTitles.map((t) => ({
            key: t.id,
            title: t.title,
            sub: mySubs.find((x) => x.title_id === t.id) ?? null,
          }))
          const known = new Set(myTitles.map((t) => t.id))
          for (const x of mySubs) {
            if (!x.title_id || !known.has(x.title_id)) {
              lines.push({
                key: x.id,
                title: x.title_id ? `${x.title_text ?? 'A removed title'} (title removed)` : 'General (no project chosen)',
                sub: x,
              })
            }
          }
          if (myTitles.length === 0 && mySubs.length === 0) {
            lines.push({ key: 'none', title: 'No project titles yet', sub: null })
          }
          return {
            id: rec.student_id,
            name: st?.full_name ?? 'Student',
            department: st?.department,
            progress,
            lines,
          }
        })
        .sort((a, b) => a.name.localeCompare(b.name))

      setData({ rows, submissions: s.data })
    })
  }, [request.id])

  const rows = data?.rows ?? []
  const complete = rows.filter((r) => r.progress.complete).length
  const partial = rows.filter((r) => r.progress.partial).length
  const none = rows.length - complete - partial

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between bg-du-green px-5 py-3 text-white">
          <h2 className="font-bold">{request.title}</h2>
          <button onClick={onClose} className="text-2xl leading-none hover:text-du-gold">×</button>
        </div>

        <div className="p-5">
          {error && <p className="text-sm text-du-red">{error}</p>}
          {!data && !error && <p className="text-gray-400">Loading...</p>}

          {data && (
            <>
              <p className="mb-3 text-sm text-gray-600">
                <b>{complete}</b> of <b>{rows.length}</b> students reported on all their projects
                {partial > 0 && <> · <b>{partial}</b> incomplete</>}
                {none > 0 && <> · <b>{none}</b> not yet</>}
                {request.deadline && ` · deadline ${new Date(request.deadline).toLocaleString()}`}
              </p>

              <div className="mb-4 flex flex-wrap gap-2">
                {STAGES.map((st) => (
                  <span key={st.key} className="rounded-full bg-du-blue/10 px-3 py-1 text-xs font-semibold text-du-blue">
                    {st.label}: {data.submissions.filter((x) => x.stage === st.key).length}
                  </span>
                ))}
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">
                  (stage counts are per project)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-du-green/10 text-du-green-dark">
                    <tr>
                      <th className="px-3 py-2">Project</th>
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
                      <FragmentRows key={r.id} r={r} />
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

function FragmentRows({ r }) {
  return (
    <>
      <tr className="border-t-2 border-gray-200 bg-gray-50">
        <td colSpan={5} className="px-3 py-2">
          <span className="font-bold">{r.name}</span>
          <span className="text-xs text-gray-500"> · {r.department || 'No department'} </span>
          <ProgressBadge p={r.progress} />
        </td>
      </tr>
      {r.lines.map((l) => (
        <tr key={l.key} className="border-t border-gray-100 align-top">
          <td className="px-3 py-2 pl-6 font-semibold">{l.title}</td>
          {l.sub ? (
            <>
              <td className="px-3 py-2">{stageLabel(l.sub.stage)}</td>
              <td className="px-3 py-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    l.sub.state === 'finished' ? 'bg-green-100 text-du-green-dark' : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {stateLabel(l.sub.state)}
                </span>
              </td>
              <td className="px-3 py-2 text-gray-600">
                {l.sub.note}
                {l.sub.link && (
                  <div>
                    <a href={l.sub.link} target="_blank" rel="noreferrer" className="text-du-blue underline">
                      Link
                    </a>
                  </div>
                )}
              </td>
              <td className="px-3 py-2 text-xs text-gray-500">{new Date(l.sub.updated_at).toLocaleString()}</td>
            </>
          ) : (
            <td colSpan={4} className="px-3 py-2 font-semibold text-du-red">Not yet submitted</td>
          )}
        </tr>
      ))}
    </>
  )
}

export default function StatusRequests() {
  const [requests, setRequests] = useState([])
  const [stats, setStats] = useState({})
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
    const [rq, rc, sb, ti, st] = await Promise.all([
      supabase.from('status_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('status_request_recipients').select('request_id, student_id'),
      supabase.from('status_submissions').select('request_id, student_id, title_id'),
      supabase.from('project_titles').select('id, student_id'),
      supabase.from('students').select('id, full_name, department').eq('status', 'active').order('full_name'),
    ])
    const err = rq.error || rc.error || sb.error || ti.error || st.error
    if (err) {
      setListError(err.message)
      setLoading(false)
      return
    }
    setListError('')
    setRequests(rq.data)
    setStudents(st.data)

    const titlesBy = {}
    ti.data.forEach((t) => (titlesBy[t.student_id] ||= []).push(t))
    const subsBy = {}
    sb.data.forEach((s) => (subsBy[`${s.request_id}:${s.student_id}`] ||= []).push(s))

    const out = {}
    for (const r of rq.data) {
      const recips = rc.data.filter((x) => x.request_id === r.id)
      let complete = 0
      let partial = 0
      for (const rec of recips) {
        const p = studentProgress(titlesBy[rec.student_id] ?? [], subsBy[`${r.id}:${rec.student_id}`] ?? [])
        if (p.complete) complete++
        else if (p.partial) partial++
      }
      out[r.id] = { total: recips.length, complete, partial }
    }
    setStats(out)
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
        <h2 className="mb-1 text-lg font-bold text-du-green-dark">Ask students for a project update</h2>
        <p className="mb-4 text-xs text-gray-500">
          Each student reports on every project title they have. A student with 3 titles sends 3 updates.
        </p>

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
            const s = stats[r.id] ?? { total: 0, complete: 0, partial: 0 }
            const pct = s.total ? Math.round((s.complete / s.total) * 100) : 0
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
                  <span className="text-gray-600">
                    {s.complete} of {s.total} students complete
                    {s.partial > 0 && <span className="text-yellow-700"> · {s.partial} incomplete</span>}
                  </span>
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