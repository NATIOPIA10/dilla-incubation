import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import VerifyBadge from '../../components/VerifyBadge'
import ProofUpload from '../../components/ProofUpload'


const inputCls =
  'w-full mb-3 rounded border border-gray-300 bg-blue-50 px-3 py-2 focus:outline-none focus:border-du-green'
const isUrl = (v) => /^https?:\/\//i.test(v)

async function openDocument(path) {
  const w = window.open('', '_blank')
  const { data } = await supabase.storage.from('ip-documents').createSignedUrl(path, 300)
  if (!data?.signedUrl) {
    w?.close()
    return
  }
  if (w) w.location.href = data.signedUrl
  else window.location.href = data.signedUrl
}

function ProjectForm({ student, project, onSaved, onCancel }) {
  const [f, setF] = useState({
    title: project?.title ?? '',
    description: project?.description ?? '',
    tech: project?.tech_stack ?? '',
    repo: project?.repo_url ?? '',
    live: project?.live_url ?? '',
    deployed: project?.is_deployed ?? false,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function save(e) {
    e.preventDefault()
    setError('')
    if (f.deployed && !f.live.trim()) return setError('A deployed project needs a live link.')
    if (f.live.trim() && !isUrl(f.live.trim())) return setError('The live link must start with http:// or https://')
    if (f.repo.trim() && !isUrl(f.repo.trim())) return setError('The code link must start with http:// or https://')
    if (
      project?.verification_status === 'verified' &&
      !window.confirm('Editing a verified project sends it for verification again. Continue?')
    ) return

    const payload = {
      title: f.title.trim(),
      description: f.description.trim() || null,
      tech_stack: f.tech.trim() || null,
      repo_url: f.repo.trim() || null,
      live_url: f.live.trim() || null,
      is_deployed: f.deployed,
    }

    setBusy(true)
    const q = project
      ? supabase.from('projects').update(payload).eq('id', project.id)
      : supabase.from('projects').insert({ ...payload, student_id: student.id })
    const { data, error: err } = await q.select('id')
    setBusy(false)
    if (err || !data?.length) return setError(err?.message ?? 'Could not save the project.')
    onSaved()
  }

  return (
    <form onSubmit={save} className="rounded-lg border-t-4 border-du-green bg-white p-4 shadow">
<h3 className="mb-1 font-bold text-du-green-dark">{project ? 'Edit project' : 'Add a project'}</h3>
<p className="mb-3 text-xs text-gray-500">
  After the admin verifies a project, it is shown to all members of the Incubation Center with your name and
  department. Your code link stays private.
</p>
      <label className="mb-1 block text-sm text-gray-600">Project title</label>
      <input className={inputCls} value={f.title} onChange={set('title')} maxLength={150} required />

      <label className="mb-1 block text-sm text-gray-600">Description</label>
      <textarea className={inputCls} rows={3} value={f.description} onChange={set('description')} />

      <label className="mb-1 block text-sm text-gray-600">Technologies used</label>
      <input className={inputCls} value={f.tech} onChange={set('tech')} placeholder="e.g. React, Supabase" />

      <label className="mb-1 block text-sm text-gray-600">Code link (optional, never shown to other members)</label>
      <input className={inputCls} value={f.repo} onChange={set('repo')} placeholder="https://github.com/..." />

      <label className="mb-3 flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={f.deployed} onChange={(e) => setF({ ...f, deployed: e.target.checked })} />
        This project is deployed (live online)
      </label>

      <label className="mb-1 block text-sm text-gray-600">Live link {f.deployed ? '(required)' : '(optional)'}</label>
      <input className={inputCls} value={f.live} onChange={set('live')} placeholder="https://" />

      {error && <p className="mb-3 text-sm text-du-red">{error}</p>}
      <div className="flex gap-3">
        <button disabled={busy}
          className="rounded bg-du-green-dark px-4 py-2 text-sm font-semibold text-white hover:bg-du-green disabled:opacity-60">
          {busy ? 'Saving...' : 'Save project'}
        </button>
        <button type="button" onClick={onCancel}
          className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </form>
  )
}

function RightForm({ student, record, projects, onSaved, onCancel }) {
  const [f, setF] = useState({
    type: record?.ip_type ?? 'copyright',
    title: record?.title ?? '',
    number: record?.registration_number ?? '',
    authority: record?.issuing_authority ?? '',
    date: record?.granted_date ?? '',
    projectId: record?.project_id ?? '',
  })
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })


  async function save(e) {
    e.preventDefault()
    setError('')
    if (!record && !file) return setError('Please upload the proof document.')
    if (
      record?.verification_status === 'verified' &&
      !window.confirm('Editing a verified record sends it for verification again. Continue?')
    ) return

    setBusy(true)
    let documentPath = record?.document_path
    if (file) {
      const ext = file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : 'jpg'
      documentPath = `${student.auth_user_id}/${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('ip-documents')
        .upload(documentPath, file, { contentType: file.type })
      if (upErr) {
        setBusy(false)
        return setError('Could not upload the document. Please try again.')
      }
    }

    const payload = {
      ip_type: f.type,
      title: f.title.trim(),
      registration_number: f.number.trim() || null,
      issuing_authority: f.authority.trim() || null,
      granted_date: f.date || null,
      project_id: f.projectId || null,
      document_path: documentPath,
    }
    const q = record
      ? supabase.from('ip_records').update(payload).eq('id', record.id)
      : supabase.from('ip_records').insert({ ...payload, student_id: student.id })
    const { data, error: err } = await q.select('id')
    setBusy(false)
    if (err || !data?.length) return setError(err?.message ?? 'Could not save the record.')
    onSaved()
  }

  return (
    <form onSubmit={save} className="rounded-lg border-t-4 border-du-green bg-white p-4 shadow">
      <h3 className="mb-3 font-bold text-du-green-dark">
        {record ? 'Edit record' : 'Add a copyright or patent'}
      </h3>

      <label className="mb-1 block text-sm text-gray-600">Type</label>
      <select className={inputCls} value={f.type} onChange={set('type')}>
        <option value="copyright">Copyright</option>
        <option value="patent">Patent</option>
      </select>

      <label className="mb-1 block text-sm text-gray-600">Title of the work or invention</label>
      <input className={inputCls} value={f.title} onChange={set('title')} maxLength={200} required />

      <label className="mb-1 block text-sm text-gray-600">Registration number (if you have it)</label>
      <input className={inputCls} value={f.number} onChange={set('number')} />

      <label className="mb-1 block text-sm text-gray-600">Issuing authority</label>
      <input className={inputCls} value={f.authority} onChange={set('authority')}
        placeholder="e.g. Ethiopian Intellectual Property Authority" />

      <label className="mb-1 block text-sm text-gray-600">Date granted</label>
      <input className={inputCls} type="date" value={f.date} onChange={set('date')} />

      <label className="mb-1 block text-sm text-gray-600">Related project (optional)</label>
      <select className={inputCls} value={f.projectId} onChange={set('projectId')}>
        <option value="">None</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>{p.title}</option>
        ))}
      </select>

      <ProofUpload
  file={file}
  onChange={setFile}
  required={!record}
  hasExisting={!!record}
  onViewExisting={() => openDocument(record.document_path)}
/>

      {error && <p className="mb-3 text-sm text-du-red">{error}</p>}
      <div className="flex gap-3">
        <button disabled={busy}
          className="rounded bg-du-green-dark px-4 py-2 text-sm font-semibold text-white hover:bg-du-green disabled:opacity-60">
          {busy ? 'Saving...' : 'Save record'}
        </button>
        <button type="button" onClick={onCancel}
          className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </form>
  )
}

export default function Portfolio({ student }) {
  const [tab, setTab] = useState('projects')
  const [projects, setProjects] = useState(undefined)
  const [rights, setRights] = useState([])
  const [form, setForm] = useState(null) // { kind: 'project' | 'right', item: object | null }
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const [p, r] = await Promise.all([
      supabase.from('projects').select('*').eq('student_id', student.id).order('created_at', { ascending: false }),
      supabase.from('ip_records').select('*').eq('student_id', student.id).order('created_at', { ascending: false }),
    ])
    setProjects(p.data ?? [])
    setRights(r.data ?? [])
  }, [student.id])

  useEffect(() => {
    load()
  }, [load])

  async function remove(table, item, name) {
    if (!window.confirm(`Delete "${name}"?`)) return
    const { error: err } = await supabase.from(table).delete().eq('id', item.id)
    if (err) return setError(err.message)
    setError('')
    load()
  }

  if (projects === undefined) return null

  const done = () => {
    setForm(null)
    load()
  }

  const tabBtn = (key, label) => (
    <button
      onClick={() => { setTab(key); setForm(null) }}
      className={`rounded-full px-4 py-1 text-sm font-semibold ${
        tab === key ? 'bg-du-green text-white' : 'border border-gray-300 bg-white text-gray-600 hover:border-du-green'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="mt-8">
      <h2 className="mb-3 font-bold text-du-green-dark">🚀 My projects and rights</h2>
      <div className="mb-4 flex gap-2">
        {tabBtn('projects', `Projects (${projects.length})`)}
        {tabBtn('rights', `Copyright and patents (${rights.length})`)}
      </div>

      {error && <p className="mb-3 text-sm text-du-red">{error}</p>}

      {tab === 'projects' && (
        <>
          {form?.kind === 'project' ? (
            <ProjectForm student={student} project={form.item} onSaved={done} onCancel={() => setForm(null)} />
          ) : (
            <button onClick={() => setForm({ kind: 'project', item: null })}
              className="mb-3 rounded bg-du-green-dark px-4 py-2 text-sm font-semibold text-white hover:bg-du-green">
              + Add project
            </button>
          )}

          {projects.length === 0 && !form && <p className="text-sm text-gray-400">No projects yet.</p>}
          <div className="mt-3 space-y-3">
            {projects.map((p) => (
              <div key={p.id} className="rounded-lg bg-white p-4 shadow">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold text-du-green-dark">{p.title}</h3>
                  <VerifyBadge status={p.verification_status} />
                </div>
                {p.description && <p className="mt-1 text-sm text-gray-700">{p.description}</p>}
                <p className="mt-1 text-xs text-gray-500">
                  {p.tech_stack && `${p.tech_stack} · `}
                  {p.is_deployed ? 'Deployed' : 'Not deployed'}
                </p>
                <div className="mt-1 flex gap-4 text-xs">
                  {p.live_url && <a href={p.live_url} target="_blank" rel="noreferrer" className="text-du-blue underline">Live site</a>}
                  {p.repo_url && <a href={p.repo_url} target="_blank" rel="noreferrer" className="text-du-blue underline">Code</a>}
                </div>
                {p.verification_status === 'rejected' && p.rejection_reason && (
                  <p className="mt-2 rounded bg-red-50 p-2 text-sm text-du-red">
                    Rejected: {p.rejection_reason}. Edit the project to send it again.
                  </p>
                )}
                <div className="mt-3 flex gap-4 text-sm">
                  <button onClick={() => setForm({ kind: 'project', item: p })} className="text-du-blue hover:underline">Edit</button>
                  {p.verification_status !== 'verified' && (
                    <button onClick={() => remove('projects', p, p.title)} className="text-du-red hover:underline">Delete</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'rights' && (
        <>
          {form?.kind === 'right' ? (
            <RightForm student={student} record={form.item} projects={projects} onSaved={done} onCancel={() => setForm(null)} />
          ) : (
            <button onClick={() => setForm({ kind: 'right', item: null })}
              className="mb-3 rounded bg-du-green-dark px-4 py-2 text-sm font-semibold text-white hover:bg-du-green">
              + Add copyright or patent
            </button>
          )}

          {rights.length === 0 && !form && <p className="text-sm text-gray-400">No records yet.</p>}
          <div className="mt-3 space-y-3">
            {rights.map((r) => (
              <div key={r.id} className="rounded-lg bg-white p-4 shadow">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold text-du-green-dark">
                    {r.ip_type === 'patent' ? 'Patent' : 'Copyright'}: {r.title}
                  </h3>
                  <VerifyBadge status={r.verification_status} />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {r.registration_number && `No. ${r.registration_number} · `}
                  {r.issuing_authority}
                  {r.granted_date && ` · ${new Date(r.granted_date).toLocaleDateString()}`}
                </p>
                {r.verification_status === 'rejected' && r.rejection_reason && (
                  <p className="mt-2 rounded bg-red-50 p-2 text-sm text-du-red">
                    Rejected: {r.rejection_reason}. Edit the record to send it again.
                  </p>
                )}
                <div className="mt-3 flex gap-4 text-sm">
                  <button onClick={() => openDocument(r.document_path)} className="text-du-blue hover:underline">View document</button>
                  <button onClick={() => setForm({ kind: 'right', item: r })} className="text-du-blue hover:underline">Edit</button>
                  {r.verification_status !== 'verified' && (
                    <button onClick={() => remove('ip_records', r, r.title)} className="text-du-red hover:underline">Delete</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}