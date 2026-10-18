import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { STAGES } from '../../lib/stages'

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-lg border-t-4 border-du-green bg-white p-4 shadow">
      <div className="text-3xl font-bold text-du-green-dark">{value}</div>
      <div className="text-sm font-semibold text-gray-700">{label}</div>
      {hint && <div className="mt-1 text-xs text-gray-500">{hint}</div>}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="rounded-lg bg-white p-5 shadow">
      <h2 className="mb-4 font-bold text-du-green-dark">{title}</h2>
      {children}
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(undefined)
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const head = { count: 'exact', head: true }
      const nowIso = new Date().toISOString()

      const res = await Promise.all([
        supabase.from('students').select('id', head).eq('status', 'pending'),
        supabase.from('students').select('id', head).eq('profile_status', 'submitted'),
        supabase.from('projects').select('id', head).eq('verification_status', 'pending'),
        supabase.from('ip_records').select('id', head).eq('verification_status', 'pending'),
        supabase.from('students').select('id, status, profile_status').in('status', ['approved', 'active']),
        supabase.from('room_occupancy').select('capacity, status'),
        supabase.from('room_assignments').select('student_id').is('ended_at', null),
        supabase.from('student_latest_status').select('student_id, stage, state'),
        supabase.from('students').select('id, certificates(id)').eq('status', 'deactivated'),
        supabase.from('events').select('id, title, event_date, location')
          .gte('event_date', nowIso).order('event_date').limit(5),
        supabase.from('events').select('id', head).is('telegram_sent_at', null).not('telegram_error', 'is', null),
        supabase.from('status_requests').select('id', head).or(`deadline.is.null,deadline.gt.${nowIso}`),
                supabase.rpc('id_pool_remaining'),
        supabase.from('support_messages').select('id', head).eq('direction', 'in').is('read_at', null),
                supabase.from('support_messages').select('id', head).eq('kind', 'reset_request').eq('status', 'open'),
      ])

      const failed = res.find((r) => r.error)
      if (failed) {
        if (!cancelled) setError(failed.error.message)
        return
      }
      const [pend, profWait, projPend, rightsPend, students, rooms, assigns, latest, deact, upcoming, tg, openReq, pool, support, resets] = res
            
      const activeStudents = students.data
      const base = activeStudents.filter((s) => s.status === 'active')
      const baseIds = new Set(base.map((s) => s.id))
      const approvedProfile = activeStudents.filter((s) => s.profile_status === 'approved')
      const assignedIds = new Set(assigns.data.map((a) => a.student_id))

      const latestBase = latest.data.filter((l) => baseIds.has(l.student_id))
      const stageCounts = STAGES.map((st) => ({
        ...st,
        total: latestBase.filter((l) => l.stage === st.key).length,
        finished: latestBase.filter((l) => l.stage === st.key && l.state === 'finished').length,
      }))

      const noCert = deact.data.filter((s) => {
        const c = s.certificates
        return !(Array.isArray(c) ? c.length : c)
      }).length

      if (cancelled) return
      setError('')
      setData({
        pendingRegistrations: pend.count ?? 0,
        profilesWaiting: profWait.count ?? 0,
        verifyWaiting: (projPend.count ?? 0) + (rightsPend.count ?? 0),
        certificatesToIssue: noCert,
        telegramFailed: tg.count ?? 0,
        openRequests: openReq.count ?? 0,
        activeCount: activeStudents.length,
        seatsTotal: rooms.data
          .filter((r) => r.status === 'available')
          .reduce((n, r) => n + Number(r.capacity), 0),
        seatsUsed: assigns.data.length,
        waitingForSeat: approvedProfile.filter((s) => !assignedIds.has(s.id)).length,
        stageCounts,
        noAnswer: base.length - latestBase.length,
        baseCount: base.length,
        upcoming: upcoming.data,
        pool: pool.data,
                unreadSupport: support.count ?? 0,
                        openResets: resets.count ?? 0,
      })
    }

    load()
    return () => {
      cancelled = true
    }
  }, [tick])

  if (error) return <p className="text-sm text-du-red">{error}</p>
  if (!data) return <p className="text-gray-400">Loading...</p>

  const attention = [
    { label: 'password reset requests waiting', n: data.openResets, to: '/admin/support' },
    { label: 'unread support messages', n: data.unreadSupport, to: '/admin/support' },
    { label: 'registrations waiting for review', n: data.pendingRegistrations, to: '/admin/registrations' },
    { label: 'profiles waiting for review', n: data.profilesWaiting, to: '/admin/profiles' },
    { label: 'projects or rights waiting for verification', n: data.verifyWaiting, to: '/admin/verification' },
    { label: 'deactivated students without a certificate', n: data.certificatesToIssue, to: '/admin/certificates' },
    { label: 'announcements that failed to reach Telegram', n: data.telegramFailed, to: '/admin/events' },
  ].filter((a) => a.n > 0)

  const seatPct = data.seatsTotal ? Math.min(100, Math.round((data.seatsUsed / data.seatsTotal) * 100)) : 0
  const poolLow = typeof data.pool === 'number' && data.pool < 1000

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-du-green-dark">Overview</h2>
        <button onClick={() => setTick(tick + 1)}
          className="rounded border border-du-green-dark px-3 py-1 text-sm font-semibold text-du-green-dark hover:bg-green-50">
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active students" value={data.activeCount} />
        <StatCard label="Seats used" value={`${data.seatsUsed} / ${data.seatsTotal}`} />
        <StatCard label="Waiting for a seat" value={data.waitingForSeat} hint="Approved profile, no room yet" />
        <StatCard label="Open status requests" value={data.openRequests} />
      </div>

      <Section title="Needs your attention">
        {attention.length === 0 ? (
          <p className="text-sm text-du-green-dark">All caught up ✔ Nothing is waiting for you.</p>
        ) : (
          <ul className="space-y-2">
            {attention.map((a) => (
              <li key={a.label}>
                <Link to={a.to}
                  className="flex items-center justify-between rounded border border-gray-200 px-4 py-2 text-sm hover:border-du-green hover:bg-green-50">
                  <span>
                    <b className="mr-2 inline-block min-w-6 rounded-full bg-du-red px-2 py-0.5 text-center text-xs text-white">{a.n}</b>
                    {a.label}
                  </span>
                  <span className="text-du-green-dark">Open →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Room occupancy">
          <div className="mb-2 flex justify-between text-sm text-gray-600">
            <span>{data.seatsUsed} of {data.seatsTotal} seats used</span>
            <span>{seatPct}%</span>
          </div>
          <div className="h-4 overflow-hidden rounded bg-gray-200">
            <div className={`h-full ${seatPct >= 90 ? 'bg-du-maroon' : 'bg-du-green'}`} style={{ width: `${seatPct}%` }} />
          </div>
          <p className="mt-3 text-xs text-gray-500">
            {data.seatsTotal - data.seatsUsed} seats are free. Rooms under maintenance are not counted.
          </p>
          <Link to="/admin/rooms" className="mt-3 inline-block text-sm text-du-blue underline">Manage rooms</Link>
        </Section>

        <Section title="Upcoming events">
          {data.upcoming.length === 0 ? (
            <p className="text-sm text-gray-400">No upcoming events with a date.</p>
          ) : (
            <ul className="space-y-3">
              {data.upcoming.map((e) => (
                <li key={e.id} className="border-l-4 border-du-green pl-3 text-sm">
                  <div className="font-bold text-du-green-dark">{e.title}</div>
                  <div className="text-xs text-gray-500">
                    🗓 {new Date(e.event_date).toLocaleString()}
                    {e.location && ` · 📍 ${e.location}`}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link to="/admin/events" className="mt-3 inline-block text-sm text-du-blue underline">Announcements</Link>
        </Section>
      </div>

      <Section title="Where are the students' projects now?">
        {data.baseCount === 0 ? (
          <p className="text-sm text-gray-400">No active students yet.</p>
        ) : (
          <div className="space-y-3">
            {data.stageCounts.map((st) => {
              const pct = Math.round((st.total / data.baseCount) * 100)
              return (
                <div key={st.key}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-semibold">{st.label}</span>
                    <span className="text-gray-500">
                      {st.total} {st.total === 1 ? 'student' : 'students'}
                      {st.key !== 'completed' && st.total > 0 && ` (${st.finished} finished this stage)`}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded bg-gray-200">
                    <div className="h-full bg-du-blue" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-semibold text-gray-500">No answer yet</span>
                <span className="text-gray-500">{data.noAnswer} students</span>
              </div>
              <div className="h-3 overflow-hidden rounded bg-gray-200">
                <div className="h-full bg-gray-400" style={{ width: `${Math.round((data.noAnswer / data.baseCount) * 100)}%` }} />
              </div>
            </div>
          </div>
        )}
        <p className="mt-4 text-xs text-gray-500">Each student is counted once, using their most recent answer.</p>
        <Link to="/admin/status" className="mt-2 inline-block text-sm text-du-blue underline">Project status requests</Link>
      </Section>

      <div className={`rounded-lg p-4 text-sm shadow ${poolLow ? 'border border-du-red bg-red-50 text-du-red' : 'bg-white text-gray-600'}`}>
        <b>{typeof data.pool === 'number' ? data.pool.toLocaleString() : '—'}</b> of 10,000 incubation ID numbers are still available.
        {poolLow && ' The pool is running low. Plan to extend the ID format soon.'}
      </div>
    </div>
  )
}