import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Showcase() {
  const [projects, setProjects] = useState(undefined)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [deployedOnly, setDeployedOnly] = useState(false)

  useEffect(() => {
    supabase
      .from('published_projects')
      .select('*')
      .order('verified_at', { ascending: false })
      .limit(200)
      .then(({ data, error: e }) => {
        if (e) setError(e.message)
        setProjects(data ?? [])
      })
  }, [])

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (projects ?? []).filter(
      (p) =>
        (!deployedOnly || p.is_deployed) &&
        (!q ||
          [p.title, p.description, p.tech_stack, p.author_name, p.author_department].some((v) =>
            v?.toLowerCase().includes(q)
          ))
    )
  }, [projects, search, deployedOnly])

  if (projects === undefined) return <p className="text-gray-400">Loading...</p>

  return (
    <div>
      <h2 className="text-xl font-bold text-du-green-dark">🌟 Project showcase</h2>
      <p className="mb-4 text-sm text-gray-500">Verified projects built at the Incubation Center.</p>

      {error && <p className="mb-3 text-sm text-du-red">{error}</p>}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, technology, or author"
          className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-du-green focus:outline-none sm:w-72"
        />
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={deployedOnly} onChange={(e) => setDeployedOnly(e.target.checked)} />
          Deployed only
        </label>
        <span className="text-xs text-gray-400">{shown.length} projects</span>
      </div>

      {shown.length === 0 && (
        <p className="text-sm text-gray-400">
          {projects.length === 0
            ? 'No projects are published yet. Verified projects appear here.'
            : 'No projects match your search.'}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {shown.map((p) => (
          <div key={p.id} className="flex flex-col rounded-lg border-t-4 border-du-green bg-white p-4 shadow">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-du-green-dark">{p.title}</h3>
              {p.is_deployed && (
                <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-du-green-dark">
                  Deployed
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              by <b>{p.author_name}</b>
              {p.author_department && ` · ${p.author_department}`}
            </p>
            {p.description && <p className="mt-2 flex-1 text-sm text-gray-700">{p.description}</p>}
            {p.tech_stack && (
              <div className="mt-3 flex flex-wrap gap-1">
                {p.tech_stack
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean)
                  .map((t) => (
                    <span key={t} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-du-blue">
                      {t}
                    </span>
                  ))}
              </div>
            )}
            <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
              <span>Verified {p.verified_at && new Date(p.verified_at).toLocaleDateString()}</span>
              {p.live_url && (
                <a
                  href={p.live_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="rounded border border-du-blue px-3 py-1 text-sm font-semibold text-du-blue hover:bg-blue-50"
                >
                  Open live site ↗
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}