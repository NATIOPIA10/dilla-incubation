import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const FILTERS = [
  ['all', 'All'],
  ['test', 'Not sent (test)'],
  ['sent', 'Sent'],
  ['failed', 'Failed'],
]
const BADGE = {
  test: ['Not sent (test mode)', 'bg-yellow-100 text-yellow-800'],
  sent: ['Sent', 'bg-green-100 text-du-green-dark'],
  manual: ['Sent by hand', 'bg-green-100 text-du-green-dark'],
  failed: ['Failed', 'bg-red-100 text-du-red'],
}
const PURPOSE = {
  approval: 'Approval',
  correction: 'Correction link',
  reset: 'Password reset',
  test: 'Test',
  other: 'Other',
}

async function functionError(e) {
  let msg = e.message
  try {
    const body = await e.context.json()
    if (body?.error) msg = body.error
  } catch { /* keep the generic message */ }
  return msg
}

export default function SmsOutbox() {
  const [mode, setMode] = useState(null)
  const [rows, setRows] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState(null)

  const [phone, setPhone] = useState('')
  const [text, setText] = useState('Test message from the Dilla University Incubation Center.')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState(null)

  const load = useCallback(async () => {
    let q = supabase
      .from('sms_log')
      .select('*, students(full_name)')
      .order('created_at', { ascending: false })
      .limit(100)
    if (filter === 'test') q = q.eq('status', 'test')
    if (filter === 'sent') q = q.in('status', ['sent', 'manual'])
    if (filter === 'failed') q = q.eq('status', 'failed')
    const { data, error: e } = await q
    setLoading(false)
    if (e) return setError(e.message)
    setError('')
    setRows(data)
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    supabase.functions.invoke('send-sms', { body: { action: 'status' } }).then(({ data }) => {
      if (data?.mode) setMode(data)
    })
  }, [])

  async function sendTest(e) {
    e.preventDefault()
    setNote(null)
    setBusy(true)
    const { data, error: err } = await supabase.functions.invoke('send-sms', {
      body: { phone, message: text, purpose: 'test' },
    })
    setBusy(false)
    if (err) return setNote({ tone: 'bad', text: await functionError(err) })
    if (data.status === 'test') {
      setNote({ tone: 'warn', text: `Test mode: nothing was sent. The message for ${data.to} was saved below.` })
    } else if (data.status === 'sent') {
      setNote({ tone: 'ok', text: `✔ Sent to ${data.to}.` })
    } else {
      setNote({ tone: 'bad', text: `Sending failed: ${data.reason}` })
    }
    load()
  }

  async function copy(r) {
    await navigator.clipboard.writeText(r.message)
    setCopiedId(r.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function markByHand(r) {
    const { data, error: err } = await supabase
      .from('sms_log')
      .update({ status: 'manual' })
      .eq('id', r.id)
      .eq('status', 'test')
      .select('id')
    if (err || !data?.length) return setError(err?.message ?? 'Could not update the message.')
    load()
  }

  const noteCls = (tone) =>
    tone === 'ok'
      ? 'border-du-green bg-green-50 text-du-green-dark'
      : tone === 'warn'
        ? 'border-yellow-400 bg-yellow-50 text-yellow-900'
        : 'border-du-red bg-red-50 text-du-red'

  return (
    <div>
      {mode && (
        <div
          className={`mb-4 rounded-lg border p-3 text-sm ${
            mode.mode === 'test'
              ? 'border-yellow-400 bg-yellow-50 text-yellow-900'
              : 'border-du-green bg-green-50 text-du-green-dark'
          }`}
        >
          {mode.mode === 'test' ? (
            <>
              <b>Test mode.</b> No SMS is sent. Every message is saved here. You can copy a message and send it from
              your own phone, then click <b>I sent it by hand</b>.
            </>
          ) : (
            <>
              <b>Live mode.</b> Messages are sent through the SMS provider. The secret links are hidden in this list.
            </>
          )}
        </div>
      )}

      <form onSubmit={sendTest} className="mb-5 grid gap-3 rounded-lg bg-white p-4 shadow md:grid-cols-[220px_1fr_auto]">
        <div>
          <label className="mb-1 block text-sm text-gray-600">Phone number</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0911 234 567"
            required
            className="w-full rounded border border-gray-300 bg-blue-50 px-3 py-2 text-sm focus:border-du-green focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-600">Test message</label>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={480}
            required
            className="w-full rounded border border-gray-300 bg-blue-50 px-3 py-2 text-sm focus:border-du-green focus:outline-none"
          />
        </div>
        <div className="flex items-end">
          <button
            disabled={busy}
            className="rounded bg-du-green-dark px-4 py-2 text-sm font-semibold text-white hover:bg-du-green disabled:opacity-50"
          >
            {busy ? 'Sending...' : 'Send test SMS'}
          </button>
        </div>
        {note && <p className={`rounded border p-2 text-sm md:col-span-3 ${noteCls(note.tone)}`}>{note.text}</p>}
      </form>

      <div className="mb-3 flex flex-wrap gap-2">
        {FILTERS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-full px-4 py-1 text-sm font-semibold ${
              filter === key
                ? 'bg-du-green text-white'
                : 'border border-gray-300 bg-white text-gray-600 hover:border-du-green'
            }`}
          >
            {label}
          </button>
        ))}
        <button onClick={load} className="ml-auto text-sm text-du-blue hover:underline">Refresh</button>
      </div>

      {error && <p className="mb-3 text-sm text-du-red">{error}</p>}
      {loading && <p className="text-gray-400">Loading...</p>}
      {!loading && rows.length === 0 && <p className="text-sm text-gray-400">No messages here.</p>}

      <div className="space-y-3">
        {rows.map((r) => {
          const [label, cls] = BADGE[r.status]
          return (
            <div key={r.id} className="rounded-lg bg-white p-4 shadow">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm">
                  <span className="font-bold text-du-green-dark">{r.students?.full_name ?? 'Test'}</span>
                  <span className="text-gray-500"> · {r.to_phone} · {PURPOSE[r.purpose]}</span>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>
              </div>
              <p className="mt-2 break-words whitespace-pre-wrap rounded bg-gray-50 p-2 text-sm text-gray-800">
                {r.message}
              </p>
              {r.error && <p className="mt-1 text-xs text-du-red">{r.error}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs">
                <span className="text-gray-400">{new Date(r.created_at).toLocaleString()}</span>
                {(r.status === 'test' || r.status === 'manual') && (
                  <button onClick={() => copy(r)} className="text-du-blue hover:underline">
                    {copiedId === r.id ? 'Copied ✔' : 'Copy message'}
                  </button>
                )}
                {r.status === 'test' && (
                  <button onClick={() => markByHand(r)} className="font-semibold text-du-green-dark hover:underline">
                    I sent it by hand
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}