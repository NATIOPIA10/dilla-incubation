import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { STAGES, STATES, stageLabel, stateLabel } from '../../lib/stages'
import { studentProgress } from '../../lib/statusProgress'

const inputCls =
  'w-full mb-3 rounded border border-gray-300 bg-blue-50 px-3 py-2 focus:outline-none focus:border-du-green'

// The form for ONE project (or the general update, for a student without titles)
function UpdateForm({ request, student, title, existing, onSaved }) {
  const [stage, setStage] = useState(existing?.stage ?? '')
  const [state, setState] = useState(existing?.state ?? '')
  const [note, setNote] = useState(existing?.note ?? '')
  const [link, setLink] = useState(existing?.link ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const finalState = stage === 'completed' ? 'finished' : state

  async function save(e) {
    e.preventDefault()
    setError('')
    if (!stage) return setError('Please choose the current stage of this project.')
    if (!finalState) return setError('Please say if this stage is in progress or finished.')
    if (link.trim() && !/^https?:\/\//i.test(link.trim())) {
      return setError('The link must start with http:// or https://')
    }

    const payload = { stage, state: finalState, note: note.trim() || null, link: link.trim() || null }

    setBusy(true)
    const query = existing
      ? supabase.from('status_submissions').update(payload).eq('id', existing.id)
      : supabase.from('status_submissions').insert({
          ...payload,
          request_id: request.id,
          student_id: student.id,
          title_id: title?.id ?? null,
        })
    const { data, error: err } = await query.select('id')
    setBusy(false)

    if (err || !data?.length) {
      return setError(err?.message ?? 'Could not save. The deadline may have passed.')
    }
    onSaved(title?.id ?? null)
  }

  return (
    <form onSubmit={save} className="mt-3">
      <label className="mb-1 block text-sm text-gray-600">Where is this project now?</label>
      <select className={inputCls} value={stage} onChange={(e) => setStage(e.target.value)}>
        <option value="">Select the stage</option>
        {STAGES.map((s) => (
          <option key={s.key} value={s.key}>{s.label}</option>
        ))}
      </select>

      <label className="mb-1 block text-sm text-gray-600">Status of this stage</label>
      <select
        className={inputCls}
        value={finalState}
        onChange={(e) => setState(e.target.value)}
        disabled={stage === 'completed'}
      >
        <option value="">Select</option>
        {STATES.map((s) => (
          <option key={s.key} value={s.key}>{s.label}</option>
        ))}
      </select>

      <label className="mb-1 block text-sm text-gray-600">Note (optional)</label>
      <textarea className={inputCls} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />

      <label className="mb-1 block text-sm text-gray-600">Link to your work (optional)</label>
      <input className={inputCls} value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" />

      {error && <p className="mb-2 text-sm text-du-red">{error}</p>}

      <button
        disabled={busy}
        className="rounded bg-du-green-dark px-4 py-2 text-sm font-semibold text-white hover:bg-du-green disabled:opacity-60"
      >
        {busy ? 'Saving...' : existing ? 'Update this project' : 'Submit for this project'}
      </button>
    </form>
  )
}

function RequestCard({ request, titles, subs, student, reload }) {
  const closed = request.deadline && new Date(request.deadline) < new Date()
  const progress = studentProgress(titles, subs)
  const subFor = (id) => subs.find((s) => s.title_id === id) ?? null

  const firstOpen = titles.find((t) => !subFor(t.id)) ?? titles[0] ?? null
  const [selectedId, setSelectedId] = useState(firstOpen?.id ?? null)
  const [message, setMessage] = useState('')

  const general = titles.length === 0
  const current = titles.find((t) => t.id === selectedId) ?? firstOpen
  const existing = general ? (subs.find((s) => !s.title_id) ?? null) : current ? subFor(current.id) : null
  const pct = Math.round((progress.done / Math.max(progress.needed, 1)) * 100)

  const badge = progress.complete
    ? ['Complete ✔', 'bg-green-100 text-du-green-dark']
    : progress.partial
      ? [`${progress.done} of ${progress.needed} done`, 'bg-blue-100 text-du-blue']
      : ['Waiting for you', 'bg-yellow-100 text-yellow-800']

  function handleSaved(savedId) {
    const next = titles.find((t) => t.id !== savedId && !subFor(t.id))
    if (next) {
      setSelectedId(next.id)
      setMessage(`Saved ✔ Next: ${next.title}`)
    } else {
      setMessage('Saved ✔ All your projects are reported.')
    }
    reload()
  }

  return (
    <div className="rounded-lg border-l-4 border-du-blue bg-white p-4 shadow">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-bold text-du-green-dark">{request.title}</h3>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${badge[1]}`}>{badge[0]}</span>
      </div>
      {request.note && <p className="mt-1 text-sm text-gray-600">{request.note}</p>}
      {request.deadline && (
        <p className={`mt-1 text-xs ${closed ? 'text-du-red' : 'text-gray-500'}`}>
          {closed ? 'Closed on ' : 'Deadline: '}
          {new Date(request.deadline).toLocaleString()}
        </p>
      )}

      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs text-gray-500">
          <span>
            {general ? 'General update' : `${progress.done} of ${progress.needed} projects reported`}
          </span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded bg-gray-200">
          <div className="h-full bg-du-green" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* What was reported, project by project */}
      {!general && (
        <ul className="mt-3 divide-y divide-gray-100 text-sm">
          {titles.map((t) => {
            const s = subFor(t.id)
            return (
              <li key={t.id} className="flex items-center justify-between gap-3 py-1.5">
                <span className="min-w-0 truncate font-semibold">{t.title}</span>
                {s ? (
                  <span className="shrink-0 text-xs text-du-green-dark">
                    ✔ {stageLabel(s.stage)} · {stateLabel(s.state)}
                  </span>
                ) : (
                  <span className="shrink-0 text-xs text-yellow-700">Waiting</span>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {closed ? (
        <p className="mt-3 text-sm text-gray-600">
          {progress.complete
            ? 'This request is closed. Thank you for reporting.'
            : 'This request is closed. Some projects were not reported.'}
        </p>
      ) : (
        <div className="mt-4 border-t border-gray-100 pt-3">
          {general ? (
            <p className="rounded bg-yellow-50 p-2 text-sm text-yellow-800">
              You have no project titles yet. Please add at least 2 in My work, then Project titles. For now, you can
              send a general update.
            </p>
          ) : (
            <>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Which project is this update for?</label>
              <select
                className={inputCls}
                value={current?.id ?? ''}
                onChange={(e) => {
                  setSelectedId(e.target.value)
                  setMessage('')
                }}
              >
                {titles.map((t) => (
                  <option key={t.id} value={t.id}>
                    {subFor(t.id) ? '✔ ' : ''}
                    {t.title}
                  </option>
                ))}
              </select>
              {titles.length > 1 && !progress.complete && (
                <p className="mb-2 text-xs text-gray-500">
                  You must send an update for every project. Use the list above to move to the next one.
                </p>
              )}
            </>
          )}

          {message && <p className="mb-2 text-sm font-semibold text-du-green-dark">{message}</p>}

          <UpdateForm
            key={`${current?.id ?? 'general'}-${existing?.updated_at ?? 'new'}`}
            request={request}
            student={student}
            title={general ? null : current}
            existing={existing}
            onSaved={handleSaved}
          />
        </div>
      )}
    </div>
  )
}

export default function ProjectStatus({ student }) {
  const [requests, setRequests] = useState(undefined)
  const [titles, setTitles] = useState([])
  const [subs, setSubs] = useState([])

  const load = useCallback(async () => {
    const [rq, ti, sb] = await Promise.all([
      supabase.from('status_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('project_titles').select('id, title').eq('student_id', student.id).order('created_at'),
      supabase.from('status_submissions').select('*').eq('student_id', student.id),
    ])
    setRequests(rq.data ?? [])
    setTitles(ti.data ?? [])
    setSubs(sb.data ?? [])
  }, [student.id])

  useEffect(() => {
    load()
  }, [load])

  if (requests === undefined) return null
  if (requests.length === 0) {
    return (
      <p className="mt-8 text-sm text-gray-400">
        No status requests yet. When the admin asks for an update, it will appear here.
      </p>
    )
  }

  return (
    <div className="mt-8">
      <h2 className="mb-3 font-bold text-du-green-dark">📋 Project status requests</h2>
      <div className="space-y-3">
        {requests.map((r) => (
          <RequestCard
            key={r.id}
            request={r}
            titles={titles}
            subs={subs.filter((s) => s.request_id === r.id)}
            student={student}
            reload={load}
          />
        ))}
      </div>
    </div>
  )
}