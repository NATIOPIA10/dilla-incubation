import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const inputCls =
  'w-full mb-4 rounded border border-gray-300 bg-blue-50 px-3 py-2 focus:outline-none focus:border-du-green'

// datetime-local needs "YYYY-MM-DDTHH:mm" in the computer's local time
const toLocalInput = (iso) => {
  const d = new Date(iso)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

function statusOf(w) {
  const now = new Date()
  if (!w.is_active) return 'stopped'
  if (new Date(w.closes_at) <= now) return 'ended'
  if (new Date(w.opens_at) > now) return 'upcoming'
  return 'open'
}

const BADGE = {
  open: ['Open now', 'bg-green-100 text-du-green-dark'],
  upcoming: ['Opens later', 'bg-blue-100 text-du-blue'],
  ended: ['Ended', 'bg-gray-200 text-gray-600'],
  stopped: ['Closed by admin', 'bg-red-100 text-du-red'],
}

function timeLeft(iso) {
  const ms = new Date(iso) - new Date()
  if (ms <= 0) return null
  const days = Math.floor(ms / 86400000)
  const hours = Math.floor((ms % 86400000) / 3600000)
  const mins = Math.floor((ms % 3600000) / 60000)
  if (days > 0) return `${days}d ${hours}h left`
  if (hours > 0) return `${hours}h ${mins}m left`
  return `${mins}m left`
}

function EditModal({ win, onClose, onSaved }) {
  const [title, setTitle] = useState(win.title)
  const [opens, setOpens] = useState(toLocalInput(win.opens_at))
  const [closes, setCloses] = useState(toLocalInput(win.closes_at))
  const [active, setActive] = useState(win.is_active)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save(e) {
    e.preventDefault()
    setError('')
    if (new Date(closes) <= new Date(opens)) return setError('The deadline must be after the opening time.')
    setBusy(true)
    const { error: err } = await supabase
      .from('registration_windows')
      .update({
        title: title.trim(),
        opens_at: new Date(opens).toISOString(),
        closes_at: new Date(closes).toISOString(),
        is_active: active,
      })
      .eq('id', win.id)
    setBusy(false)
    if (err) return setError(err.message)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={save} className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between bg-du-green px-5 py-3 text-white">
          <h2 className="font-bold">Edit registration window</h2>
          <button type="button" onClick={onClose} className="text-2xl leading-none hover:text-du-gold">×</button>
        </div>
        <div className="p-5">
          <label className="mb-1 block text-sm text-gray-600">Title</label>
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} required />

          <label className="mb-1 block text-sm text-gray-600">Opens</label>
          <input className={inputCls} type="datetime-local" value={opens} onChange={(e) => setOpens(e.target.value)} required />

          <label className="mb-1 block text-sm text-gray-600">Deadline (closes)</label>
          <input className={inputCls} type="datetime-local" value={closes} onChange={(e) => setCloses(e.target.value)} required />

          <label className="mb-4 flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Registration is switched on (untick to stop it)
          </label>

          {error && <p className="mb-3 text-sm text-du-red">{error}</p>}
          <button disabled={busy}
            className="w-full rounded bg-du-green-dark py-2 font-semibold text-white hover:bg-du-green disabled:opacity-60">
            {busy ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function RegistrationWindows() {
  const { session } = useAuth()
  const [windows, setWindows] = useState([])
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [editing, setEditing] = useState(null)
  const [, setTick] = useState(0)

  const [title, setTitle] = useState('')
  const [opens, setOpens] = useState(() => toLocalInput(new Date().toISOString()))
  const [closes, setCloses] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    const [w, s] = await Promise.all([
      supabase.from('registration_windows').select('*').order('opens_at', { ascending: false }),
      supabase.from('students').select('window_id'),
    ])
    const err = w.error || s.error
    if (err) setListError(err.message)
    else {
      setListError('')
      setWindows(w.data)
      const c = {}
      s.data.forEach((r) => {
        if (r.window_id) c[r.window_id] = (c[r.window_id] ?? 0) + 1
      })
      setCounts(c)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Refresh the "time left" text every minute
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000)
    return () => clearInterval(id)
  }, [])

  function addDays(n) {
    const base = opens ? new Date(opens) : new Date()
    base.setDate(base.getDate() + n)
    setCloses(toLocalInput(base.toISOString()))
  }

  async function create(e) {
    e.preventDefault()
    setError('')
    setNotice('')
    if (!closes) return setError('Please choose the deadline.')
    const o = new Date(opens)
    const c = new Date(closes)
    if (c <= o) return setError('The deadline must be after the opening time.')
    if (c <= new Date()) return setError('The deadline must be in the future.')

    const overlap = windows.some(
      (w) => ['open', 'upcoming'].includes(statusOf(w)) && new Date(w.opens_at) < c && new Date(w.closes_at) > o
    )
    if (overlap && !window.confirm('Another registration window is already open or scheduled during these dates. Create this one anyway?')) {
      return
    }

    setBusy(true)
    const { error: err } = await supabase.from('registration_windows').insert({
      title: title.trim(),
      opens_at: o.toISOString(),
      closes_at: c.toISOString(),
      created_by: session.user.id,
    })
    setBusy(false)
    if (err) return setError(err.message)

    setNotice('Registration window saved ✔')
    setTitle('')
    setOpens(toLocalInput(new Date().toISOString()))
    setCloses('')
    load()
  }

  async function setActive(w, value) {
    setListError('')
    const { error: err } = await supabase.from('registration_windows').update({ is_active: value }).eq('id', w.id)
    if (err) return setListError(err.message)
    load()
  }

  function reopen(w) {
    if (new Date(w.closes_at) <= new Date()) {
      setEditing(w) // the deadline has passed, so the admin must choose a new one
      return
    }
    setActive(w, true)
  }

  async function remove(w) {
    if (!window.confirm(`Delete "${w.title}"?`)) return
    const { error: err } = await supabase.from('registration_windows').delete().eq('id', w.id)
    if (err) return setListError(err.message)
    load()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <form onSubmit={create} className="h-fit rounded-lg border-t-4 border-du-green bg-white p-5 shadow">
        <h2 className="mb-1 text-lg font-bold text-du-green-dark">Open registration</h2>
        <p className="mb-4 text-xs text-gray-500">
          Students can register between the opening time and the deadline. It closes by itself at the deadline.
        </p>

        <label className="mb-1 block text-sm text-gray-600">Title</label>
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. 2026 Intake" maxLength={100} required />

        <label className="mb-1 block text-sm text-gray-600">Opens</label>
        <input className={inputCls} type="datetime-local" value={opens} onChange={(e) => setOpens(e.target.value)} required />

        <label className="mb-1 block text-sm text-gray-600">Deadline (closes)</label>
        <input className="mb-2 w-full rounded border border-gray-300 bg-blue-50 px-3 py-2 focus:border-du-green focus:outline-none"
          type="datetime-local" value={closes} onChange={(e) => setCloses(e.target.value)} required />
        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          {[7, 14, 30].map((n) => (
            <button key={n} type="button" onClick={() => addDays(n)}
              className="rounded-full border border-du-green px-3 py-1 font-semibold text-du-green-dark hover:bg-green-50">
              +{n} days
            </button>
          ))}
        </div>

        {error && <p className="mb-3 text-sm text-du-red">{error}</p>}
        {notice && <p className="mb-3 text-sm text-du-green-dark">{notice}</p>}

        <button disabled={busy}
          className="w-full rounded bg-du-green-dark py-2 font-semibold text-white hover:bg-du-green disabled:opacity-60">
          {busy ? 'Saving...' : 'Open registration'}
        </button>
      </form>

      <div>
        <h2 className="mb-3 text-lg font-bold text-du-green-dark">Registration windows</h2>
        {listError && <p className="mb-3 text-sm text-du-red">{listError}</p>}
        {loading && <p className="text-gray-400">Loading...</p>}
        {!loading && windows.length === 0 && <p className="text-gray-400">No registration windows yet.</p>}

        <div className="space-y-3">
          {windows.map((w) => {
            const st = statusOf(w)
            const [label, cls] = BADGE[st]
            const left = st === 'open' ? timeLeft(w.closes_at) : st === 'upcoming' ? timeLeft(w.opens_at) : null
            const n = counts[w.id] ?? 0
            return (
              <div key={w.id} className="rounded-lg bg-white p-4 shadow">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold text-du-green-dark">{w.title}</h3>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>
                </div>
                <div className="mt-2 space-y-0.5 text-sm text-gray-600">
                  <div>Opens: {new Date(w.opens_at).toLocaleString()}</div>
                  <div>Deadline: {new Date(w.closes_at).toLocaleString()}</div>
                  {left && (
                    <div className="font-semibold text-du-green-dark">
                      {st === 'open' ? `Closes in ${left.replace(' left', '')}` : `Opens in ${left.replace(' left', '')}`}
                    </div>
                  )}
                  <div>{n} {n === 1 ? 'student' : 'students'} registered</div>
                </div>

                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                  <button onClick={() => setEditing(w)} className="text-du-blue hover:underline">Edit dates</button>
                  {(st === 'open' || st === 'upcoming') && (
                    <button onClick={() => setActive(w, false)} className="text-du-red hover:underline">Close now</button>
                  )}
                  {st === 'stopped' && (
                    <button onClick={() => reopen(w)} className="text-du-green-dark hover:underline">Reopen</button>
                  )}
                  {n === 0 && (
                    <button onClick={() => remove(w)} className="text-gray-500 hover:underline">Delete</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {editing && (
        <EditModal
          win={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}
    </div>
  )
}