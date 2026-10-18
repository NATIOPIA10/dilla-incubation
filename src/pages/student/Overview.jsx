import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import ContactBox from '../../components/ContactBox'
import TelegramLink from './TelegramLink'

function Tile({ icon, title, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border-t-4 border-du-green bg-white p-4 text-left shadow transition hover:shadow-md"
    >
      <div className="mb-1 flex items-center gap-2 text-sm font-bold text-du-green-dark">
        <span className="text-xl">{icon}</span>
        {title}
      </div>
      <div className="text-sm text-gray-700">{children}</div>
    </button>
  )
}

export default function Overview({ student, incubationId, go }) {
  const [d, setD] = useState(null)

  useEffect(() => {
    const head = { count: 'exact', head: true }
    Promise.all([
      supabase.from('room_assignments').select('rooms(building, room_number)')
        .eq('student_id', student.id).is('ended_at', null).maybeSingle(),
      supabase.from('events').select('title, created_at')
        .order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('status_requests').select('id, deadline'),
      supabase.from('status_submissions').select('request_id').eq('student_id', student.id),
      supabase.from('project_titles').select('id', head).eq('student_id', student.id),
      supabase.from('projects').select('id', head).eq('student_id', student.id),
      supabase.from('ip_records').select('id', head).eq('student_id', student.id),
    ]).then(([room, ev, rq, sb, tt, pr, ip]) => {
      const answered = new Set((sb.data ?? []).map((x) => x.request_id))
      const now = new Date()
      const waiting = (rq.data ?? []).filter(
        (r) => !answered.has(r.id) && (!r.deadline || new Date(r.deadline) > now)
      ).length
      setD({
        room: room.data?.rooms ?? null,
        event: ev.data ?? null,
        waiting,
        titles: (student.proposed_titles?.length ?? 0) + (tt.count ?? 0),
        projects: pr.count ?? 0,
        rights: ip.count ?? 0,
      })
    })
  }, [student.id, student.proposed_titles])

  if (!d) return <p className="text-gray-400">Loading...</p>

  return (
    <div>
      <h1 className="text-2xl font-bold text-du-green-dark">Welcome, {student.full_name}</h1>
      <p className="mb-5 text-sm text-gray-500">
        Incubation ID:{' '}
        <span className="font-mono font-bold text-du-maroon">{incubationId ?? '...'}</span>
      </p>
       
             <TelegramLink />
             
      {d.waiting > 0 && (
        <button
          onClick={() => go('status')}
          className="mb-5 flex w-full items-center justify-between rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-left text-sm font-semibold text-yellow-800"
        >
          <span>
            📋 {d.waiting} project status {d.waiting === 1 ? 'request is' : 'requests are'} waiting for your answer
          </span>
          <span>Answer →</span>
        </button>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Tile icon="🪪" title="My ID card" onClick={() => go('id')}>
          <span className="font-mono font-bold">{incubationId ?? '...'}</span>
          <span className="block text-xs text-du-blue">View and download →</span>
        </Tile>

        <Tile icon="🏠" title="My room" onClick={() => go('home')}>
          {d.room ? `${d.room.building} · Room ${d.room.room_number}` : 'No room assigned yet'}
        </Tile>

        <Tile icon="📢" title="Latest announcement" onClick={() => go('news')}>
          {d.event ? (
            <>
              <span className="font-semibold">{d.event.title}</span>
              <span className="block text-xs text-gray-400">
                {new Date(d.event.created_at).toLocaleDateString()}
              </span>
            </>
          ) : (
            'No announcements yet'
          )}
        </Tile>

        <Tile icon="📋" title="Project status" onClick={() => go('status')}>
          {d.waiting > 0 ? `${d.waiting} waiting for you` : 'All answered ✔'}
        </Tile>

        <Tile icon="💡" title="Project titles" onClick={() => go('work', 'titles')}>
          {d.titles} submitted
          <span className="block text-xs text-du-blue">Add a new title →</span>
        </Tile>

        <Tile icon="🚀" title="Projects and rights" onClick={() => go('work', 'projects')}>
          {d.projects} {d.projects === 1 ? 'project' : 'projects'} · {d.rights} rights{' '}
          {d.rights === 1 ? 'record' : 'records'}
        </Tile>
      </div>
            <ContactBox className="mt-6" />
    </div>
  )
}