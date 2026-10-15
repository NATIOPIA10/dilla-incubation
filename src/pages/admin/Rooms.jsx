import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const shortId = (s) =>
  s?.id_number ? `DUIC-${s.id_number}/${String(s.id_year % 100).padStart(2, '0')}` : ''

const inputCls =
  'w-full rounded border border-gray-300 bg-blue-50 px-3 py-2 focus:border-du-green focus:outline-none'

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between bg-du-green px-5 py-3 text-white">
          <h2 className="font-bold">{title}</h2>
          <button onClick={onClose} className="text-2xl leading-none hover:text-du-gold">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function AddRoomForm({ onAdded }) {
  const [building, setBuilding] = useState('')
  const [roomNumber, setRoomNumber] = useState('')
  const [capacity, setCapacity] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error: err } = await supabase.from('rooms').insert({
      building: building.trim(),
      room_number: roomNumber.trim(),
      capacity: Number(capacity),
    })
    setBusy(false)
    if (err) {
      return setError(err.code === '23505' ? 'That room already exists in this building.' : err.message)
    }
    setBuilding('')
    setRoomNumber('')
    setCapacity('')
    onAdded()
  }

  return (
    <form onSubmit={submit} className="mb-6 grid gap-3 rounded-lg bg-white p-4 shadow md:grid-cols-4">
      <div>
        <label className="mb-1 block text-sm text-gray-600">Building</label>
        <input className={inputCls} value={building} onChange={(e) => setBuilding(e.target.value)} required />
      </div>
      <div>
        <label className="mb-1 block text-sm text-gray-600">Room number</label>
        <input className={inputCls} value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} required />
      </div>
      <div>
        <label className="mb-1 block text-sm text-gray-600">Seats (capacity)</label>
        <input className={inputCls} type="number" min="1" max="50" value={capacity}
          onChange={(e) => setCapacity(e.target.value)} required />
      </div>
      <div className="flex items-end">
        <button disabled={busy}
          className="w-full rounded bg-du-green-dark px-4 py-2 font-semibold text-white hover:bg-du-green disabled:opacity-50">
          {busy ? 'Adding...' : 'Add room'}
        </button>
      </div>
      {error && <p className="text-sm text-du-red md:col-span-4">{error}</p>}
    </form>
  )
}

export default function Rooms() {
  const { session } = useAuth()
  const [rooms, setRooms] = useState([])
  const [assignments, setAssignments] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [assignTo, setAssignTo] = useState(null) // a room
  const [moving, setMoving] = useState(null) // an assignment
  const [pick, setPick] = useState('')
  const [modalError, setModalError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const [r, a, s] = await Promise.all([
      supabase.from('room_occupancy').select('*').order('building').order('room_number'),
      supabase
        .from('room_assignments')
        .select('id, room_id, student_id, started_at, students(full_name, department, id_number, id_year)')
        .is('ended_at', null)
        .order('started_at'),
      supabase
        .from('students')
        .select('id, full_name, department, id_number, id_year')
        .eq('status', 'active')
        .eq('profile_status', 'approved')
        .order('full_name'),
    ])
    const err = r.error || a.error || s.error
    if (err) setError(err.message)
    else {
      setError('')
      setRooms(r.data)
      setAssignments(a.data)
      setStudents(s.data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const assignedIds = new Set(assignments.map((a) => a.student_id))
  const unassigned = students.filter((s) => !assignedIds.has(s.id))
  const totalBeds = rooms.filter((r) => r.status === 'available').reduce((n, r) => n + Number(r.capacity), 0)
  const usedBeds = assignments.length

  function closeModals() {
    setAssignTo(null)
    setMoving(null)
    setPick('')
    setModalError('')
  }

  async function assign() {
    if (!pick) return setModalError('Please choose a student.')
    setBusy(true)
    setModalError('')
    const { error: err } = await supabase.from('room_assignments').insert({
      student_id: pick,
      room_id: assignTo.id,
      assigned_by: session.user.id,
    })
    setBusy(false)
    if (err) return setModalError(err.message)
    closeModals()
    load()
  }

  async function move() {
    if (!pick) return setModalError('Please choose the new room.')
    setBusy(true)
    setModalError('')
    const { error: err } = await supabase.rpc('move_student', {
      p_student: moving.student_id,
      p_room: pick,
    })
    setBusy(false)
    if (err) return setModalError(err.message)
    closeModals()
    load()
  }

  async function removeFromRoom(a) {
    if (!window.confirm(`Remove ${a.students.full_name} from this room?`)) return
    const { error: err } = await supabase
      .from('room_assignments')
      .update({ ended_at: new Date().toISOString(), end_reason: 'removed' })
      .eq('id', a.id)
    if (err) return setError(err.message)
    load()
  }

  async function toggleMaintenance(room) {
    const next = room.status === 'available' ? 'maintenance' : 'available'
    const { error: err } = await supabase.from('rooms').update({ status: next }).eq('id', room.id)
    if (err) return setError(err.message)
    load()
  }

  async function editCapacity(room) {
    const value = window.prompt(`New number of seats for ${room.building} ${room.room_number}:`, room.capacity)
    if (value === null) return
    const n = Number(value)
    if (!Number.isInteger(n) || n < 1 || n > 50) return setError('Seats must be a whole number from 1 to 50.')
    if (n < Number(room.occupied)) {
      return setError(`${room.occupied} students live there now. Move some out first.`)
    }
    const { error: err } = await supabase.from('rooms').update({ capacity: n }).eq('id', room.id)
    if (err) return setError(err.message)
    load()
  }

  const stat = (label, value) => (
    <div className="rounded-lg bg-white p-4 text-center shadow">
      <div className="text-2xl font-bold text-du-green-dark">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  )

  if (loading) return <p className="p-6 text-center text-gray-400">Loading...</p>

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stat('Rooms', rooms.length)}
        {stat('Seats available', totalBeds)}
        {stat('Students housed', usedBeds)}
        {stat('Waiting for a room', unassigned.length)}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-bold text-du-green-dark">Rooms</h2>
        <button onClick={() => setShowAdd(!showAdd)}
          className="rounded bg-du-green-dark px-4 py-2 text-sm font-semibold text-white hover:bg-du-green">
          {showAdd ? 'Close' : '+ Add room'}
        </button>
      </div>

      {showAdd && <AddRoomForm onAdded={load} />}
      {error && <p className="mb-3 text-sm text-du-red">{error}</p>}
      {rooms.length === 0 && <p className="py-8 text-center text-gray-400">No rooms yet. Add the first room.</p>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => {
          const occupants = assignments.filter((a) => a.room_id === room.id)
          const occupied = Number(room.occupied)
          const pct = Math.min(100, Math.round((occupied / room.capacity) * 100))
          const isFull = occupied >= room.capacity
          const maintenance = room.status === 'maintenance'
          return (
            <div key={room.id}
              className={`rounded-lg border-t-4 bg-white p-4 shadow ${maintenance ? 'border-gray-400' : isFull ? 'border-du-maroon' : 'border-du-green'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-du-green-dark">{room.building} · Room {room.room_number}</div>
                  <div className="text-xs text-gray-500">{occupied} of {room.capacity} seats used</div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  maintenance ? 'bg-gray-200 text-gray-600'
                  : isFull ? 'bg-red-100 text-du-maroon'
                  : 'bg-green-100 text-du-green-dark'}`}>
                  {maintenance ? 'Maintenance' : isFull ? 'Full' : 'Available'}
                </span>
              </div>

              <div className="my-3 h-2 overflow-hidden rounded bg-gray-200">
                <div className={`h-full ${isFull ? 'bg-du-maroon' : 'bg-du-green'}`} style={{ width: `${pct}%` }} />
              </div>

              <ul className="mb-3 space-y-2">
                {occupants.length === 0 && <li className="text-sm text-gray-400">Empty</li>}
                {occupants.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{a.students.full_name}</div>
                      <div className="truncate text-xs text-gray-500">
                        {a.students.department} · {shortId(a.students)}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2 text-xs">
                      <button onClick={() => { setMoving(a); setPick('') }} className="text-du-blue hover:underline">Move</button>
                      <button onClick={() => removeFromRoom(a)} className="text-du-red hover:underline">Remove</button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-center gap-3 text-sm">
                <button
                  disabled={maintenance || isFull}
                  onClick={() => { setAssignTo(room); setPick('') }}
                  className="rounded bg-du-green-dark px-3 py-1 font-semibold text-white hover:bg-du-green disabled:opacity-40"
                >
                  Assign student
                </button>
                <button onClick={() => editCapacity(room)} className="text-gray-500 hover:underline">Edit seats</button>
                <button onClick={() => toggleMaintenance(room)} className="text-gray-500 hover:underline">
                  {maintenance ? 'Reopen' : 'Maintenance'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {assignTo && (
        <Modal title={`Assign to ${assignTo.building} · Room ${assignTo.room_number}`} onClose={closeModals}>
          {unassigned.length === 0 ? (
            <p className="text-sm text-gray-500">
              No students are waiting for a room. Only students with an approved profile can be assigned.
            </p>
          ) : (
            <>
              <label className="mb-1 block text-sm text-gray-600">Student</label>
              <select className={inputCls} value={pick} onChange={(e) => setPick(e.target.value)}>
                <option value="">Select a student</option>
                {unassigned.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name} ({shortId(s)})</option>
                ))}
              </select>
              {modalError && <p className="mt-3 text-sm text-du-red">{modalError}</p>}
              <button disabled={busy} onClick={assign}
                className="mt-4 w-full rounded bg-du-green-dark py-2 font-semibold text-white hover:bg-du-green disabled:opacity-50">
                {busy ? 'Assigning...' : 'Assign'}
              </button>
            </>
          )}
        </Modal>
      )}

      {moving && (
        <Modal title={`Move ${moving.students.full_name}`} onClose={closeModals}>
          <label className="mb-1 block text-sm text-gray-600">New room</label>
          <select className={inputCls} value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">Select a room</option>
            {rooms
              .filter((r) => r.id !== moving.room_id && r.status === 'available' && Number(r.free_beds) > 0)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.building} · Room {r.room_number} ({r.free_beds} free)
                </option>
              ))}
          </select>
          {modalError && <p className="mt-3 text-sm text-du-red">{modalError}</p>}
          <button disabled={busy} onClick={move}
            className="mt-4 w-full rounded bg-du-green-dark py-2 font-semibold text-white hover:bg-du-green disabled:opacity-50">
            {busy ? 'Moving...' : 'Move student'}
          </button>
        </Modal>
      )}
    </div>
  )
}