import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import ChangePassword from './ChangePassword'
import ProfileForm from './ProfileForm'
import IdCard from '../../components/IdCard'
import ProjectStatus from './ProjectStatus'
import Portfolio from './Portfolio'
import ProjectTitles from './ProjectTitles'

function Card({ title, children, tone = 'green' }) {
  return (
    <div className="max-w-xl mx-auto p-8 text-center">
      <div className={`bg-white border-t-4 rounded shadow p-8 ${tone === 'red' ? 'border-du-maroon' : 'border-du-green'}`}>
        <h1 className="text-2xl font-bold text-du-green-dark mb-2">{title}</h1>
        <div className="text-gray-600">{children}</div>
      </div>
    </div>
  )
}

function RoomInfo({ student }) {
  const [room, setRoom] = useState(undefined)

  useEffect(() => {
    supabase
      .from('room_assignments')
      .select('started_at, rooms(building, room_number)')
      .eq('student_id', student.id)
      .is('ended_at', null)
      .maybeSingle()
      .then(({ data }) => setRoom(data ?? null))
  }, [student.id])

  if (room === undefined) return null

  return (
    <div className="mt-6 max-w-[340px] rounded-lg bg-du-blue p-4 text-white shadow">
      <p className="font-bold text-du-gold">Your room</p>
      {room ? (
        <>
          <p className="mt-1 text-xl font-bold">
            {room.rooms.building} · Room {room.rooms.room_number}
          </p>
          <p className="text-xs">Since {new Date(room.started_at).toLocaleDateString()}</p>
        </>
      ) : (
        <p className="mt-1 text-sm">No room assigned yet. The admin will assign one soon.</p>
      )}
    </div>
  )
}

function Announcements() {
  const [events, setEvents] = useState(undefined)

  useEffect(() => {
    supabase
      .from('events')
      .select('id, title, details, event_date, location, created_at')
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setEvents(data ?? []))
  }, [])

  if (events === undefined) return null

  return (
    <div className="mt-8">
      <h2 className="mb-3 font-bold text-du-green-dark">📢 Announcements</h2>
      {events.length === 0 && <p className="text-sm text-gray-400">No announcements yet.</p>}
      <div className="space-y-3">
        {events.map((ev) => (
          <div key={ev.id} className="rounded-lg border-l-4 border-du-green bg-white p-4 shadow">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-bold text-du-green-dark">{ev.title}</h3>
              <span className="shrink-0 text-xs text-gray-400">
                {new Date(ev.created_at).toLocaleDateString()}
              </span>
            </div>
            {(ev.event_date || ev.location) && (
              <p className="mt-1 text-xs text-gray-500">
                {ev.event_date && `🗓 ${new Date(ev.event_date).toLocaleString()}`}
                {ev.event_date && ev.location && ' · '}
                {ev.location && `📍 ${ev.location}`}
              </p>
            )}
            <p className="mt-2 whitespace-pre-line text-sm text-gray-700">{ev.details}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function Dashboard({ student }) {
  const [incubationId, setIncubationId] = useState(null)

  useEffect(() => {
    supabase.rpc('incubation_id', { p_student: student.id }).then(({ data }) => setIncubationId(data))
  }, [student.id])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-du-green-dark mb-1">Welcome, {student.full_name}</h1>
      <p className="text-gray-500 mb-6">Username: {student.username}</p>

      <h2 className="mb-3 font-bold text-du-green-dark">Your incubation center ID card</h2>
      {incubationId ? (
        <IdCard student={student} incubationId={incubationId} />
      ) : (
        <p className="text-gray-400">Loading your ID card...</p>
      )}
      <RoomInfo student={student} />
      <Announcements />
      <ProjectStatus student={student} />
      <ProjectTitles student={student} />
      <Portfolio student={student} />
      <p className="mt-8 text-sm text-gray-500">
        Your room, announcements, and project status will appear here in later steps.
      </p>
    </div>
  )
}
export default function StudentHome() {
  const { session, isAdmin, loading: authLoading } = useAuth()
  const [student, setStudent] = useState(undefined) // undefined = loading, null = none
  const userId = session?.user?.id

  const load = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('students')
      .select('*')
      .eq('auth_user_id', userId)
      .maybeSingle()
    setStudent(data ?? null)
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  if (authLoading) return <p className="text-center p-10 text-gray-500">Loading...</p>
  if (!session) return <Navigate to="/" replace />
  if (isAdmin) return <Navigate to="/admin" replace />
  if (student === undefined) return <p className="text-center p-10 text-gray-500">Loading...</p>

  if (student === null) {
    return <Card title="No student account found" tone="red">Please contact the incubation center admin.</Card>
  }
  if (student.status === 'deactivated') {
    return <Card title="Account closed" tone="red">Your incubation center account is no longer active.</Card>
  }

  if (student.must_change_password) return <ChangePassword onDone={load} />

  if (['draft', 'rejected'].includes(student.profile_status)) {
    return <ProfileForm student={student} onChanged={load} />
  }

  if (student.profile_status === 'submitted') {
    return (
      <Card title="Profile under review">
        Thank you. The admin is reviewing your profile. You will receive your incubation center ID once it is approved.
      </Card>
    )
  }

  return <Dashboard student={student} />
}