import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function ProjectTitles({ student }) {
  const [titles, setTitles] = useState(undefined)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const registered = student.proposed_titles ?? []

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('project_titles')
      .select('id, title, created_at')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false })
    setTitles(data ?? [])
  }, [student.id])

  useEffect(() => {
    load()
  }, [load])

  async function add(e) {
    e.preventDefault()
    setError('')
    setNotice('')
    const t = value.trim()
    if (t.length < 3 || t.length > 150) return setError('A title must be between 3 and 150 characters.')

    const known = [...registered, ...titles.map((x) => x.title)]
    if (known.some((x) => x.toLowerCase() === t.toLowerCase())) {
      return setError('You already submitted this title.')
    }

    setBusy(true)
    const { error: err } = await supabase.from('project_titles').insert({ student_id: student.id, title: t })
    setBusy(false)
    if (err) return setError(err.code === '23505' ? 'You already submitted this title.' : err.message)

    setValue('')
    setNotice('Title submitted ✔')
    load()
  }

  async function remove(item) {
    if (!window.confirm(`Delete "${item.title}"?`)) return
    const { error: err } = await supabase.from('project_titles').delete().eq('id', item.id)
    if (err) return setError(err.message)
    setNotice('')
    load()
  }

  if (titles === undefined) return null

  return (
    <div className="mt-8">
      <h2 className="mb-3 font-bold text-du-green-dark">💡 My project titles</h2>

      <div className="rounded-lg border-l-4 border-du-green bg-white p-4 shadow">
        <form onSubmit={add} className="mb-4">
          <label className="mb-1 block text-sm text-gray-600">Submit a new title you want to work on</label>
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
              {busy ? 'Adding...' : 'Add'}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-du-red">{error}</p>}
          {notice && <p className="mt-2 text-sm text-du-green-dark">{notice}</p>}
        </form>

        {titles.length > 0 && (
          <>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">New titles</p>
            <ul className="mb-4 divide-y divide-gray-100">
              {titles.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="break-words font-semibold">{t.title}</div>
                    <div className="text-xs text-gray-400">{new Date(t.created_at).toLocaleDateString()}</div>
                  </div>
                  <button onClick={() => remove(t)} className="shrink-0 text-xs text-du-red hover:underline">
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Submitted at registration
        </p>
        {registered.length === 0 ? (
          <p className="text-sm text-gray-400">None.</p>
        ) : (
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {registered.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}