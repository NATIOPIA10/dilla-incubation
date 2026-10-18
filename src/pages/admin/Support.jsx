import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const YEARS = { 2: '2nd year', 3: '3rd year', 4: '4th year', 5: '5th year' }

const fullId = (s) =>
  s?.id_number ? `DUIC-${s.id_number}/${String(s.id_year % 100).padStart(2, '0')}` : '—'

function when(iso) {
  const d = new Date(iso)
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString()
}

export default function Support() {
  const [params, setParams] = useSearchParams()
  const selected = params.get('student')

  const [threads, setThreads] = useState([])
  const [students, setStudents] = useState({})
  const [previews, setPreviews] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [messages, setMessages] = useState([])
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [sendError, setSendError] = useState('')
  const endRef = useRef(null)

  const loadList = useCallback(async () => {
    const [t, m] = await Promise.all([
      supabase.from('support_threads').select('*').order('last_at', { ascending: false }),
      supabase
        .from('support_messages')
        .select('student_id, body, direction, created_at')
        .order('created_at', { ascending: false })
        .limit(300),
    ])
    const err = t.error || m.error
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    setError('')
    setThreads(t.data)

    const pv = {}
    for (const row of m.data) if (!pv[row.student_id]) pv[row.student_id] = row
    setPreviews(pv)

    const ids = new Set(t.data.map((x) => x.student_id))
    if (selected) ids.add(selected)
    if (ids.size) {
      const { data: st } = await supabase
        .from('students')
        .select('id, full_name, department, year_of_study, phone, status, id_number, id_year')
        .in('id', [...ids])
      const map = {}
      for (const s of st ?? []) map[s.id] = s
      setStudents(map)
    }
    setLoading(false)
  }, [selected])

  const loadThread = useCallback(
    async (id) => {
      const { data, error: e } = await supabase
        .from('support_messages')
        .select('*')
        .eq('student_id', id)
        .order('created_at', { ascending: true })
      if (e) return setError(e.message)
      setMessages(data)
      if (data.some((x) => x.direction === 'in' && !x.read_at)) {
        await supabase
          .from('support_messages')
          .update({ read_at: new Date().toISOString() })
          .eq('student_id', id)
          .eq('direction', 'in')
          .is('read_at', null)
        loadList()
      }
    },
    [loadList]
  )

  useEffect(() => {
    loadList()
  }, [loadList])

  useEffect(() => {
    setMessages([])
    setSendError('')
    if (selected) loadThread(selected)
  }, [selected, loadThread])

  // Refresh every 20 seconds
  useEffect(() => {
    const id = setInterval(() => {
      loadList()
      if (selected) loadThread(selected)
    }, 20000)
    return () => clearInterval(id)
  }, [loadList, loadThread, selected])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, selected])

  async function send(e) {
    e.preventDefault()
    setSendError('')
    const text = reply.trim()
    if (!text) return
    setBusy(true)
    const { data, error: err } = await supabase.functions.invoke('support-reply', {
      body: { studentId: selected, text },
    })
    setBusy(false)
    if (err) {
      let msg = err.message
      try {
        const b = await err.context.json()
        if (b?.error) msg = b.error
      } catch { /* keep the generic message */ }
      return setSendError(msg)
    }
    if (data?.delivery === 'failed') {
      setSendError('The message was saved, but Telegram did not deliver it. The student may have blocked the bot. Please use the phone instead.')
    }
    setReply('')
    loadThread(selected)
    loadList()
  }

  const student = selected ? students[selected] : null
  const open = (id) => setParams(id ? { student: id } : {})

  return (
    <div>
      {error && <p className="mb-3 text-sm text-du-red">{error}</p>}

      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        {/* Conversation list */}
        <div className={`rounded-lg bg-white shadow ${selected ? 'hidden md:block' : ''}`}>
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h2 className="font-bold text-du-green-dark">Conversations</h2>
            <button onClick={loadList} className="text-xs text-du-blue hover:underline">Refresh</button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {loading && <p className="p-4 text-sm text-gray-400">Loading...</p>}
            {!loading && threads.length === 0 && (
              <p className="p-4 text-sm text-gray-400">
                No messages yet. Students write to the Telegram bot, and their messages appear here.
              </p>
            )}
            {threads.map((t) => {
              const s = students[t.student_id]
              const p = previews[t.student_id]
              return (
                <button
                  key={t.student_id}
                  onClick={() => open(t.student_id)}
                  className={`block w-full border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50 ${
                    selected === t.student_id ? 'bg-green-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold">{s?.full_name ?? 'Student'}</span>
                    <span className="shrink-0 text-xs text-gray-400">{p && when(p.created_at)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm text-gray-500">
                      {p ? `${p.direction === 'out' ? 'You: ' : ''}${p.body}` : ''}
                    </span>
                    {Number(t.unread) > 0 && (
                      <span className="shrink-0 rounded-full bg-du-red px-2 py-0.5 text-xs font-bold text-white">
                        {t.unread}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Chat */}
        <div className={`flex min-h-[60vh] flex-col rounded-lg bg-white shadow ${selected ? '' : 'hidden md:flex'}`}>
          {!selected ? (
            <p className="m-auto p-6 text-sm text-gray-400">Choose a conversation.</p>
          ) : (
            <>
              <div className="border-b border-gray-100 px-4 py-3">
                <button onClick={() => open(null)} className="mb-1 text-xs text-du-blue hover:underline md:hidden">
                  ← Back
                </button>
                {student ? (
                  <>
                    <div className="font-bold text-du-green-dark">{student.full_name}</div>
                    <div className="text-xs text-gray-500">
                      {fullId(student)} · {student.department || 'No department'} ·{' '}
                      {YEARS[student.year_of_study] ?? ''} · {student.phone} · {student.status}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-gray-400">Loading student...</div>
                )}
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto p-4" style={{ maxHeight: '55vh' }}>
                {messages.length === 0 && (
                  <p className="text-sm text-gray-400">No messages yet. You can write the first one below.</p>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                        m.direction === 'out' ? 'bg-du-green text-white' : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {m.body}
                      <div className={`mt-1 text-[10px] ${m.direction === 'out' ? 'text-white/70' : 'text-gray-400'}`}>
                        {new Date(m.created_at).toLocaleString()}
                        {m.delivery === 'failed' && ' · Not delivered'}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>

              <form onSubmit={send} className="border-t border-gray-100 p-3">
                {sendError && <p className="mb-2 text-sm text-du-red">{sendError}</p>}
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="Write a reply. It is sent to the student on Telegram as the Incubation Center."
                  className="w-full rounded border border-gray-300 bg-blue-50 px-3 py-2 text-sm focus:border-du-green focus:outline-none"
                />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-gray-400">{reply.length}/1000 · Never ask for a password.</span>
                  <button
                    disabled={busy || !reply.trim()}
                    className="rounded bg-du-green-dark px-4 py-2 text-sm font-semibold text-white hover:bg-du-green disabled:opacity-50"
                  >
                    {busy ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}