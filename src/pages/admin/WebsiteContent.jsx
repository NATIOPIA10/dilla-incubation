import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp, ExternalLink, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { mergeContent } from '../../lib/siteDefaults'

const inputCls =
  'w-full rounded border border-gray-300 bg-blue-50 px-3 py-2 text-sm focus:border-du-green focus:outline-none'

// Saves or resets one section (one row of the site_content table)
function useSaver(contentKey, adminId, onChanged) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  async function save(value) {
    setMessage(null)
    setBusy(true)
    const { error } = await supabase
      .from('site_content')
      .upsert(
        { key: contentKey, value, updated_by: adminId, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      )
    setBusy(false)
    if (error) return setMessage({ tone: 'bad', text: error.message })
    setMessage({ tone: 'ok', text: 'Saved ✔ The website shows the new text now.' })
    onChanged()
  }

  async function reset() {
    if (!window.confirm('Go back to the default text for this section? Your changes will be removed.')) return
    setMessage(null)
    setBusy(true)
    const { error } = await supabase.from('site_content').delete().eq('key', contentKey)
    setBusy(false)
    if (error) return setMessage({ tone: 'bad', text: error.message })
    setMessage({ tone: 'ok', text: 'The default text is back.' })
    onChanged()
  }

  return { busy, message, setMessage, save, reset }
}

function Section({ title, help, custom, dirty, saver, onSave, children }) {
  return (
    <section className="rounded-lg border-t-4 border-du-green bg-white p-5 shadow">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-du-green-dark">{title}</h2>
          {help && <p className="text-sm text-gray-500">{help}</p>}
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            custom ? 'bg-green-100 text-du-green-dark' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {custom ? 'Customized' : 'Default text'}
        </span>
      </div>

      {children}

      {saver.message && (
        <p className={`mt-3 text-sm ${saver.message.tone === 'ok' ? 'text-du-green-dark' : 'text-du-red'}`}>
          {saver.message.text}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button
          disabled={saver.busy || !dirty}
          onClick={onSave}
          className="rounded bg-du-green-dark px-4 py-2 text-sm font-semibold text-white hover:bg-du-green disabled:opacity-50"
        >
          {saver.busy ? 'Saving...' : 'Save'}
        </button>
        {custom && (
          <button disabled={saver.busy} onClick={saver.reset} className="text-sm text-du-red hover:underline">
            Reset to default text
          </button>
        )}
        {dirty && <span className="text-xs font-semibold text-yellow-700">Unsaved changes</span>}
      </div>
    </section>
  )
}

function Counter({ value, max }) {
  return (
    <span className={`text-xs ${value.length > max ? 'text-du-red' : 'text-gray-400'}`}>
      {value.length}/{max}
    </span>
  )
}

function HomeSection({ initial, custom, adminId, onChanged }) {
  const [headline, setHeadline] = useState(initial.headline)
  const [intro, setIntro] = useState(initial.intro)
  const key = JSON.stringify(initial)
  useEffect(() => {
    const v = JSON.parse(key)
    setHeadline(v.headline)
    setIntro(v.intro)
  }, [key])

  const saver = useSaver('home', adminId, onChanged)
  const dirty = headline !== initial.headline || intro !== initial.intro

  function submit() {
    const h = headline.trim()
    const i = intro.trim()
    if (h.length < 3 || h.length > 120) return saver.setMessage({ tone: 'bad', text: 'The headline must be 3 to 120 characters.' })
    if (i.length > 500) return saver.setMessage({ tone: 'bad', text: 'The introduction must be at most 500 characters.' })
    saver.save({ headline: h, intro: i })
  }

  return (
    <Section title="Home page" help="The large text at the top of the home page." custom={custom} dirty={dirty} saver={saver} onSave={submit}>
      <label className="mb-1 flex justify-between text-sm text-gray-600">
        Headline <Counter value={headline} max={120} />
      </label>
      <input className={`${inputCls} mb-3`} value={headline} onChange={(e) => setHeadline(e.target.value)} />
      <label className="mb-1 flex justify-between text-sm text-gray-600">
        Introduction <Counter value={intro} max={500} />
      </label>
      <textarea className={inputCls} rows={4} value={intro} onChange={(e) => setIntro(e.target.value)} />
    </Section>
  )
}

function AboutSection({ initial, custom, adminId, onChanged }) {
  const [text, setText] = useState(initial.text)
  const key = JSON.stringify(initial)
  useEffect(() => {
    setText(JSON.parse(key).text)
  }, [key])

  const saver = useSaver('about', adminId, onChanged)
  const dirty = text !== initial.text

  function submit() {
    const t = text.trim()
    if (t.length < 10 || t.length > 2000) return saver.setMessage({ tone: 'bad', text: 'The text must be 10 to 2000 characters.' })
    saver.save({ text: t })
  }

  return (
    <Section title="About page" help="The main paragraph on the About page. Line breaks are kept." custom={custom} dirty={dirty} saver={saver} onSave={submit}>
      <label className="mb-1 flex justify-between text-sm text-gray-600">
        Text <Counter value={text} max={2000} />
      </label>
      <textarea className={inputCls} rows={6} value={text} onChange={(e) => setText(e.target.value)} />
    </Section>
  )
}

// A list of items with several fields each (used for "What we offer" and the FAQ)
function ListSection({ contentKey, title, help, initial, custom, adminId, onChanged, fields, max, addLabel }) {
  const [items, setItems] = useState(initial)
  const key = JSON.stringify(initial)
  useEffect(() => {
    setItems(JSON.parse(key))
  }, [key])

  const saver = useSaver(contentKey, adminId, onChanged)
  const dirty = JSON.stringify(items) !== key

  const setField = (i, name, v) => setItems(items.map((it, idx) => (idx === i ? { ...it, [name]: v } : it)))
  const remove = (i) => setItems(items.filter((_, idx) => idx !== i))
  const add = () => items.length < max && setItems([...items, Object.fromEntries(fields.map((f) => [f.name, '']))])
  const move = (i, d) => {
    const j = i + d
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[i], next[j]] = [next[j], next[i]]
    setItems(next)
  }

  function submit() {
    const cleaned = []
    for (let i = 0; i < items.length; i++) {
      const vals = fields.map((f) => String(items[i][f.name] ?? '').trim())
      if (vals.every((v) => !v)) continue // an empty item is simply dropped
      if (vals.some((v) => !v)) {
        return saver.setMessage({ tone: 'bad', text: `Item ${i + 1}: please fill in every field, or remove the item.` })
      }
      const row = {}
      for (let k = 0; k < fields.length; k++) {
        if (vals[k].length > fields[k].max) {
          return saver.setMessage({
            tone: 'bad',
            text: `Item ${i + 1}: "${fields[k].label}" is too long (at most ${fields[k].max} characters).`,
          })
        }
        row[fields[k].name] = vals[k]
      }
      cleaned.push(row)
    }
    saver.save(cleaned)
  }

  return (
    <Section title={title} help={help} custom={custom} dirty={dirty} saver={saver} onSave={submit}>
      {items.length === 0 && <p className="mb-3 text-sm text-gray-400">No items. This section is hidden on the website.</p>}

      <div className="space-y-3">
        {items.map((it, i) => (
          <div key={i} className="rounded border border-gray-200 bg-gray-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Item {i + 1}</span>
              <span className="flex gap-1">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} title="Move up"
                  className="rounded p-1 text-gray-500 hover:bg-white disabled:opacity-30">
                  <ChevronUp size={16} />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} title="Move down"
                  className="rounded p-1 text-gray-500 hover:bg-white disabled:opacity-30">
                  <ChevronDown size={16} />
                </button>
                <button type="button" onClick={() => remove(i)} title="Delete this item"
                  className="rounded p-1 text-du-red hover:bg-white">
                  <Trash2 size={16} />
                </button>
              </span>
            </div>
            {fields.map((f) => (
              <div key={f.name} className="mb-2 last:mb-0">
                <label className="mb-1 flex justify-between text-xs text-gray-600">
                  {f.label} <Counter value={String(it[f.name] ?? '')} max={f.max} />
                </label>
                {f.multiline ? (
                  <textarea className={inputCls} rows={3} value={it[f.name] ?? ''} onChange={(e) => setField(i, f.name, e.target.value)} />
                ) : (
                  <input className={inputCls} value={it[f.name] ?? ''} onChange={(e) => setField(i, f.name, e.target.value)} />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={add}
        disabled={items.length >= max}
        className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-du-blue hover:underline disabled:opacity-40"
      >
        <Plus size={16} aria-hidden="true" /> {addLabel} {items.length >= max && `(maximum ${max})`}
      </button>
    </Section>
  )
}

function ContactSection({ initial, custom, adminId, onChanged }) {
  const [v, setV] = useState(initial)
  const key = JSON.stringify(initial)
  useEffect(() => {
    setV(JSON.parse(key))
  }, [key])

  const saver = useSaver('contact', adminId, onChanged)
  const dirty = JSON.stringify(v) !== key
  const set = (name) => (e) => setV({ ...v, [name]: e.target.value })

  function submit() {
    const out = {
      office: (v.office ?? '').trim(),
      hours: (v.hours ?? '').trim(),
      phone: (v.phone ?? '').trim(),
      email: (v.email ?? '').trim(),
      telegram: (v.telegram ?? '').trim().replace(/^@/, ''),
      map_url: (v.map_url ?? '').trim(),
    }
    const limits = { office: 200, hours: 120, phone: 40, email: 120, telegram: 32, map_url: 300 }
    for (const [name, max] of Object.entries(limits)) {
      if (out[name].length > max) return saver.setMessage({ tone: 'bad', text: `"${name}" is too long (at most ${max} characters).` })
    }
    if (out.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(out.email)) {
      return saver.setMessage({ tone: 'bad', text: 'The email address does not look right.' })
    }
    if (out.telegram && !/^[A-Za-z0-9_]{5,32}$/.test(out.telegram)) {
      return saver.setMessage({ tone: 'bad', text: 'The Telegram name must have 5 to 32 letters, numbers, or underscores, without the @.' })
    }
    if (out.map_url && !/^https?:\/\/[^\s]{3,300}$/.test(out.map_url)) {
      return saver.setMessage({ tone: 'bad', text: 'The map link must start with https://' })
    }
    saver.save(out)
  }

  const field = (name, label, placeholder, max) => (
    <div className="mb-3">
      <label className="mb-1 flex justify-between text-sm text-gray-600">
        {label} <Counter value={v[name] ?? ''} max={max} />
      </label>
      <input className={inputCls} value={v[name] ?? ''} onChange={set(name)} placeholder={placeholder} />
    </div>
  )

  return (
    <Section
      title="Contact details"
      help="Shown on the Contact page and in the footer. Leave a field empty to hide it."
      custom={custom}
      dirty={dirty}
      saver={saver}
      onSave={submit}
    >
      <div className="grid gap-x-4 md:grid-cols-2">
        {field('office', 'Office', 'e.g. Incubation Center office, Block 3, Dilla University', 200)}
        {field('hours', 'Opening hours', 'e.g. Monday to Friday, 8:30 to 5:30', 120)}
        {field('phone', 'Phone', 'e.g. +251 9XX XXX XXX', 40)}
        {field('email', 'Email', 'e.g. incubation@example.edu.et', 120)}
        {field('telegram', 'Telegram name (without @)', 'e.g. du_incubation', 32)}
        {field('map_url', 'Map link', 'https://maps.google.com/...', 300)}
      </div>
    </Section>
  )
}

export default function WebsiteContent() {
  const { session } = useAuth()
  const adminId = session?.user?.id
  const [rows, setRows] = useState(undefined)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data, error: e } = await supabase.from('site_content').select('key, value')
    if (e) return setError(e.message)
    setError('')
    setRows(data ?? [])
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (rows === undefined) return <p className={error ? 'text-sm text-du-red' : 'text-gray-400'}>{error || 'Loading...'}</p>

  const content = mergeContent(rows)
  const custom = new Set(rows.map((r) => r.key))
  const common = { adminId, onChanged: load }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white p-4 shadow">
        <p className="text-sm text-gray-600">
          Edit the text that visitors see on the public website. Each section has its own <b>Save</b> button, and the
          website shows the change at once.
        </p>
        <Link
          to="/"
          target="_blank"
          className="inline-flex shrink-0 items-center gap-1 rounded border border-du-green-dark px-3 py-1.5 text-sm font-semibold text-du-green-dark hover:bg-green-50"
        >
          View the website <ExternalLink size={14} aria-hidden="true" />
        </Link>
      </div>
      {error && <p className="text-sm text-du-red">{error}</p>}

      <HomeSection initial={content.home} custom={custom.has('home')} {...common} />
      <AboutSection initial={content.about} custom={custom.has('about')} {...common} />
      <ListSection
        contentKey="offer"
        title="What we offer"
        help="Blocks shown on the home page and the About page. Use the arrows to change the order."
        initial={content.offer}
        custom={custom.has('offer')}
        fields={[
          { name: 'title', label: 'Title', max: 80 },
          { name: 'text', label: 'Text', max: 300, multiline: true },
        ]}
        max={8}
        addLabel="Add a block"
        {...common}
      />
      <ListSection
        contentKey="faq"
        title="Frequently asked questions"
        help="Shown at the bottom of the About page."
        initial={content.faq}
        custom={custom.has('faq')}
        fields={[
          { name: 'q', label: 'Question', max: 150 },
          { name: 'a', label: 'Answer', max: 800, multiline: true },
        ]}
        max={15}
        addLabel="Add a question"
        {...common}
      />
      <ContactSection initial={content.contact} custom={custom.has('contact')} {...common} />
    </div>
  )
}