import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const MIN_TITLES = 2

export default function ProjectTitles({ student }) {
  const [titles, setTitles] = useState(undefined)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('project_titles')
      .select('id, title, created_at')
      .eq('student_id', student.id)
      .order('created_at', { ascending: true })
    setTitles(data ?? [])
  }, [student.id])

  useEffect(() => {
    load()
  }, [load])

  function problem(t, ignoreId) {
    if (t.length < 3 || t.length > 150) return 'A title must be between 3 and 150 characters.'
    if (titles.some((x) => x.id !== ignoreId && x.title.toLowerCase() === t.toLowerCase())) {
      return 'You already have this title.'
    }
    return ''
  }

  async function add(e) {
    e.preventDefault()
    setError('')
    setNotice('')
    const t = value.trim()
    const p = problem(t, null)
    if (p) return setError(p)

    setBusy(true)
    const { error: err } = await supabase.from('project_titles').insert({ student_id: student.id, title: t })
    setBusy(false)
    if (err) return setError(err.code === '23505' ? 'You already have this title.' : err.message)
    setValue('')
    setNotice('Title added ✔')
    load()
  }

  async function saveEdit(id) {
    setError('')
    setNotice('')
    const t = editValue.trim()
    const p = problem(t, id)
    if (p) return setError(p)

    setBusy(true)
    const { data, error: err } = await supabase
      .from('project_titles')
      .update({ title: t })
      .eq('id', id)
      .select('id')
    setBusy(false)
    if (err || !data?.length) {
      return setError(
        err?.code === '23505' ? 'You already have this title.' : (err?.message ?? 'The title could not be changed.')
      )
    }
    setEditingId(null)
    setNotice('Title changed ✔')
    load()
  }

  async function remove(item) {
    setError('')
    setNotice('')
    if (!window.confirm(`Delete "${item.title}"?`)) return
    const { error: err } = await supabase.from('project_titles').delete().eq('id', item.id)
    if (err) return setError(err.message)
    setNotice('Title deleted.')
    load()
  }

  if (titles === undefined) return null

  return (
    <div className="mt-8">
      <h2 className="mb-3 font-bold text-du-green-dark">💡 My project titles</h2>

      <div className="rounded-lg border-l-4 border-du-green bg-white p-4 shadow">
        <p className="mb-3 text-sm text-gray-600">
          These are the projects you plan to work on. You can add, change, or delete titles at any time, but you
          must keep at least {MIN_TITLES}.
        </p>

        {titles.length < MIN_TITLES && (
          <p className="mb-3 rounded bg-yellow-100 px-3 py-2 text-sm font-semibold text-yellow-800">
            Please add at least {MIN_TITLES} titles.
          </p>
        )}

        <form onSubmit={add} className="mb-4">
          <label className="mb-1 block text-sm text-gray-600">Add a new title</label>
          <div className="flex gap-2">
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              maxLength={150}
              placeholder="Project title"
              className="w-full rounded border border-gray-300 bg-blue-50 px-3 py-2 focus:border-du-green focus:outline-none"
            />
            <button
              disabled={busy}
              className="shrink-0 rounded bg-du-green-dark px-4 py-2 text-sm font-semibold text-white hover:bg-du-green disabled:opacity-60"
            >
              Add
            </button>
          </div>
        </form>

        {error && <p className="mb-3 text-sm text-du-red">{error}</p>}
        {notice && <p className="mb-3 text-sm text-du-green-dark">{notice}</p>}

        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Your titles ({titles.length})
        </p>
        {titles.length === 0 ? (
          <p className="text-sm text-gray-400">No titles yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {titles.map((t) => (
              <li key={t.id} className="py-2 text-sm">
                {editingId === t.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      maxLength={150}
                      className="min-w-0 flex-1 rounded border border-gray-300 bg-blue-50 px-3 py-1.5 focus:border-du-green focus:outline-none"
                    />
                    <button
                      disabled={busy}
                      onClick={() => saveEdit(t.id)}
                      className="rounded bg-du-green-dark px-3 py-1 font-semibold text-white hover:bg-du-green disabled:opacity-60"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null)
                        setError('')
                      }}
                      className="rounded border border-gray-300 px-3 py-1 text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="break-words font-semibold">{t.title}</div>
                      <div className="text-xs text-gray-400">{new Date(t.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="flex shrink-0 gap-3 text-xs">
                      <button
                        onClick={() => {
                          setEditingId(t.id)
                          setEditValue(t.title)
                          setError('')
                          setNotice('')
                        }}
                        className="text-du-blue hover:underline"
                      >
                        Edit
                      </button>
                      <button onClick={() => remove(t)} className="text-du-red hover:underline">
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}