import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import VerifyBadge from '../../components/VerifyBadge'

const KINDS = [
  { key: 'projects', table: 'projects', label: 'Projects' },
  { key: 'rights', table: 'ip_records', label: 'Copyright and patents' },
]
const FILTERS = [
  { key: 'pending', label: 'Waiting' },
  { key: 'verified', label: 'Verified' },
  { key: 'rejected', label: 'Rejected' },
]

async function openDocument(path) {
  const w = window.open('', '_blank')
  const { data } = await supabase.storage.from('ip-documents').createSignedUrl(path, 300)
  if (!data?.signedUrl) {
    w?.close()
    return
  }
  if (w) w.location.href = data.signedUrl
  else window.location.href = data.signedUrl
}

function ReviewModal({ kind, item, onClose, onDone }) {
  const { session } = useAuth()
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const table = KINDS.find((k) => k.key === kind).table
  const pending = item.verification_status === 'pending'
    const [hidden, setHidden] = useState(!!item.hidden)
  const [hideBusy, setHideBusy] = useState(false)

  async function toggleHidden() {
    setHideBusy(true)
    setError('')
    const next = !hidden
    const { data, error: err } = await supabase
      .from('projects')
      .update({ hidden: next })
      .eq('id', item.id)
      .select('id')
    setHideBusy(false)
    if (err || !data?.length) return setError(err?.message ?? 'Could not save the change.')
    setHidden(next)
  }

  async function decide(status) {
    setError('')
    if (status === 'rejected' && !reason.trim()) return setError('Please write the reason for rejection.')
    setBusy(true)
    const { data, error: err } = await supabase
      .from(table)
      .update({
        verification_status: status,
        verified_by: session.user.id,
        verified_at: new Date().toISOString(),
        rejection_reason: status === 'rejected' ? reason.trim() : null,
      })
      .eq('id', item.id)
      .select('id')
    setBusy(false)
    if (err || !data?.length) return setError(err?.message ?? 'Could not save the decision.')
    onDone()
  }

  const row = (label, value) => (
    <div className="flex justify-between gap-4 border-b border-gray-100 py-2 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-semibold">{value || '—'}</span>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between bg-du-green px-5 py-3 text-white">
          <h2 className="font-bold">Review {kind === 'projects' ? 'project' : 'record'}</h2>
          <button onClick={onClose} className="text-2xl leading-none hover:text-du-gold">×</button>
        </div>

        <div className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {item.students.full_name} · {item.students.department}
            </span>
            <VerifyBadge status={item.verification_status} />
          </div>

          {kind === 'projects' ? (
            <>
              {row('Title', item.title)}
              {row('Description', item.description)}
              {row('Technologies', item.tech_stack)}
              {row('Deployed', item.is_deployed ? 'Yes' : 'No')}
              <div className="flex gap-6 py-3 text-sm">
                {item.live_url && <a href={item.live_url} target="_blank" rel="noreferrer" className="text-du-blue underline">Open live site</a>}
                {item.repo_url && <a href={item.repo_url} target="_blank" rel="noreferrer" className="text-du-blue underline">Open code</a>}
              </div>
            </>
          ) : (
            <>
              {row('Type', item.ip_type === 'patent' ? 'Patent' : 'Copyright')}
              {row('Title', item.title)}
              {row('Registration number', item.registration_number)}
              {row('Issuing authority', item.issuing_authority)}
              {row('Date granted', item.granted_date && new Date(item.granted_date).toLocaleDateString())}
              {row('Related project', item.projects?.title)}
              <div className="py-3">
                <button onClick={() => openDocument(item.document_path)}
                  className="rounded border border-du-blue px-3 py-1 text-sm font-semibold text-du-blue hover:bg-blue-50">
                  Open proof document
                </button>
              </div>
            </>
          )}
                  {kind === 'projects' && item.verification_status === 'verified' && (
            <div className="mt-3 rounded border border-gray-200 bg-gray-50 p-3 text-sm">
              <p className="mb-2">
                {hidden
                  ? 'This project is hidden from the showcase.'
                  : 'This project is shown in the showcase to all members.'}
              </p>
              <button
                disabled={hideBusy}
                onClick={toggleHidden}
                className="rounded border border-du-blue px-3 py-1 font-semibold text-du-blue hover:bg-blue-50 disabled:opacity-50"
              >
                {hidden ? 'Show in showcase' : 'Hide from showcase'}
              </button>
              {error && <p className="mt-2 text-du-red">{error}</p>}
            </div>
          )}
          {item.rejection_reason && row('Rejection reason', item.rejection_reason)}

          {pending && (
            <div className="mt-4 border-t border-gray-200 pt-4">
              {rejecting && (
                <>
                  <label className="mb-1 block text-sm text-gray-600">Reason for rejection (the student will see it)</label>
                  <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
                    className="mb-3 w-full rounded border border-gray-300 bg-blue-50 px-3 py-2 focus:border-du-green focus:outline-none" />
                </>
              )}
              {error && <p className="mb-3 text-sm text-du-red">{error}</p>}
              <div className="flex flex-wrap gap-3">
                {!rejecting ? (
                  <>
                    <button disabled={busy} onClick={() => decide('verified')}
                      className="rounded bg-du-green-dark px-4 py-2 font-semibold text-white hover:bg-du-green disabled:opacity-50">
                      {busy ? 'Saving...' : 'Verify'}
                    </button>
                    <button onClick={() => setRejecting(true)}
                      className="rounded border border-du-red px-4 py-2 font-semibold text-du-red hover:bg-red-50">
                      Reject
                    </button>
                  </>
                ) : (
                  <>
                    <button disabled={busy} onClick={() => decide('rejected')}
                      className="rounded bg-du-red px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50">
                      {busy ? 'Saving...' : 'Confirm rejection'}
                    </button>
                    <button onClick={() => { setRejecting(false); setError('') }}
                      className="rounded border border-gray-300 px-4 py-2 text-gray-600 hover:bg-gray-50">
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Verification() {
  const [kind, setKind] = useState('projects')
  const [filter, setFilter] = useState('pending')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const { table } = KINDS.find((k) => k.key === kind)
    const select =
      kind === 'projects'
        ? '*, students(full_name, department)'
        : '*, students(full_name, department), projects(title)'
    const { data, error: err } = await supabase
      .from(table)
      .select(select)
      .eq('verification_status', filter)
      .order('created_at', { ascending: true })
    setLoading(false)
    if (err) return setError(err.message)
    setRows(data)
  }, [kind, filter])

  useEffect(() => {
    load()
  }, [load])

  const pill = (active, onClick, label) => (
    <button
      key={label}
      onClick={onClick}
      className={`rounded-full px-4 py-1 text-sm font-semibold ${
        active ? 'bg-du-green text-white' : 'border border-gray-300 bg-white text-gray-600 hover:border-du-green'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {KINDS.map((k) => pill(kind === k.key, () => setKind(k.key), k.label))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => pill(filter === f.key, () => setFilter(f.key), f.label))}
      </div>

      {error && <p className="mb-3 text-sm text-du-red">{error}</p>}

      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="w-full text-left text-sm">
          <thead className="bg-du-green/10 text-du-green-dark">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">{kind === 'projects' ? 'Project' : 'Record'}</th>
              <th className="px-4 py-3">{kind === 'projects' ? 'Deployed' : 'Type'}</th>
              <th className="px-4 py-3">Added</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nothing here.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold">{r.students.full_name}</td>
                <td className="px-4 py-3">{r.title}</td>
                <td className="px-4 py-3">
                  {kind === 'projects' ? (r.is_deployed ? 'Yes' : 'No') : r.ip_type === 'patent' ? 'Patent' : 'Copyright'}
                </td>
                <td className="px-4 py-3">{new Date(r.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setSelected(r)}
                    className="rounded bg-du-green-dark px-3 py-1 text-white hover:bg-du-green">
                    {r.verification_status === 'pending' ? 'Review' : 'View'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <ReviewModal
          kind={kind}
          item={selected}
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