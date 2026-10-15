import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { STAGES, STATES, stageLabel, stateLabel } from '../../lib/stages'

const inputCls =
  'w-full mb-3 rounded border border-gray-300 bg-blue-50 px-3 py-2 focus:outline-none focus:border-du-green'

function RequestCard({ request, submission, student, onSaved }) {
  const closed = request.deadline && new Date(request.deadline) < new Date()
  const [stage, setStage] = useState(submission?.stage ?? '')
  const [state, setState] = useState(submission?.state ?? '')
  const [note, setNote] = useState(submission?.note ?? '')
  const [link, setLink] = useState(submission?.link ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const finalState = stage === 'completed' ? 'finished' : state

  async function save(e) {
    e.preventDefault()
    setError('')
    setSaved(false)
    if (!stage) return setError('Please choose your current stage.')
    if (!finalState) return setError('Please say if it is in progress or finished.')
    if (link.trim() && !/^https?:\/\//i.test(link.trim())) {
      return setError('The link must start with http:// or https://')
    }

    const payload = {
      stage,
      state: finalState,
      note: note.trim() || null,
      link: link.trim() || null,
    }

    setBusy(true)
    const query = submission
      ? supabase.from('status_submissions').update(payload).eq('id', submission.id)
      : supabase.from('status_submissions').insert({
          ...payload,
          request_id: request.id,
          student_id: student.id,
        })
    const { data, error: err } = await query.select('id')
    setBusy(false)

    if (err || !data?.length) {
      return setError(err?.message ?? 'Could not save. The deadline may have passed.')
    }
    setSaved(true)
    onSaved()
  }

  return (
    <div className="rounded-lg border-l-4 border-du-blue bg-white p-4 shadow">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-bold text-du-green-dark">{request.title}</h3>
        {submission ? (
          <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-du-green-dark">
            Submitted
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800">
            Waiting for you
          </span>
        )}
      </div>
      {request.note && <p className="mt-1 text-sm text-gray-600">{request.note}</p>}
      {request.deadline && (
        <p className={`mt-1 text-xs ${closed ? 'text-du-red' : 'text-gray-500'}`}>
          {closed ? 'Closed on ' : 'Deadline: '}
          {new Date(request.deadline).toLocaleString()}
        </p>
      )}

      {closed ? (
        <p className="mt-3 text-sm text-gray-600">
          {submission
            ? `Your answer: ${stageLabel(submission.stage)} · ${stateLabel(submission.state)}`
            : 'This request is closed and you did not submit an answer.'}
        </p>
      ) : (
        <form onSubmit={save} className="mt-3">
          <label className="mb-1 block text-sm text-gray-600">Where is your project now?</label>
          <select className={inputCls} value={stage} onChange={(e) => setStage(e.target.value)}>
            <option value="">Select your stage</option>
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
          {saved && <p className="mb-2 text-sm text-du-green-dark">Saved ✔ You can update it until the deadline.</p>}

          <button disabled={busy}
            className="rounded bg-du-green-dark px-4 py-2 text-sm font-semibold text-white hover:bg-du-green disabled:opacity-60">
            {busy ? 'Saving...' : submission ? 'Update my answer' : 'Submit'}
          </button>
        </form>
      )}
    </div>
  )
}

export default function ProjectStatus({ student }) {
  const [requests, setRequests] = useState(undefined)
  const [submissions, setSubmissions] = useState([])

  const load = useCallback(async () => {
    const [rq, sb] = await Promise.all([
      supabase.from('status_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('status_submissions').select('*').eq('student_id', student.id),
    ])
    setRequests(rq.data ?? [])
    setSubmissions(sb.data ?? [])
  }, [student.id])

  useEffect(() => {
    load()
  }, [load])

  if (requests === undefined || requests.length === 0) return null

  return (
    <div className="mt-8">
      <h2 className="mb-3 font-bold text-du-green-dark">📋 Project status requests</h2>
      <div className="space-y-3">
        {requests.map((r) => (
          <RequestCard
            key={r.id + (submissions.find((s) => s.request_id === r.id)?.updated_at ?? '')}
            request={r}
            submission={submissions.find((s) => s.request_id === r.id) ?? null}
            student={student}
            onSaved={load}
          />
        ))}
      </div>
    </div>
  )
}