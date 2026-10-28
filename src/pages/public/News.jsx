import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import usePageTitle from '../../lib/usePageTitle'

const imageUrl = (path) => supabase.storage.from('announcement-images').getPublicUrl(path).data.publicUrl

export default function News() {
  usePageTitle('News')
  const [items, setItems] = useState(undefined)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('public_news')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error: e }) => {
        if (e) setError(e.message)
        setItems(data ?? [])
      })
  }, [])

  return (
    <div>
      <section className="bg-du-green-dark text-white">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h1 className="text-3xl font-bold md:text-4xl">News and events</h1>
          <p className="mt-2 text-white/80">The latest from the Incubation Center.</p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        {error && <p className="text-sm text-du-red">{error}</p>}
        {items === undefined && <p className="text-gray-400">Loading...</p>}
        {items && items.length === 0 && (
          <p className="rounded-lg bg-white p-6 text-gray-600 shadow">No news has been published yet.</p>
        )}

        {items?.map((n) => (
          <article key={n.id} className="overflow-hidden rounded-xl border-l-4 border-du-green bg-white shadow">
            {n.image_path && (
              <img src={imageUrl(n.image_path)} alt="" className="max-h-80 w-full object-cover" loading="lazy" />
            )}
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-bold text-du-green-dark">{n.title}</h2>
                <span className="shrink-0 text-xs text-gray-400">
                  {new Date(n.created_at).toLocaleDateString('en-GB')}
                </span>
              </div>
              {(n.event_date || n.location) && (
                <p className="mt-1 text-sm text-gray-500">
                  {n.event_date &&
                    `🗓 ${new Date(n.event_date).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}`}
                  {n.event_date && n.location && ' · '}
                  {n.location && `📍 ${n.location}`}
                </p>
              )}
              <p className="mt-3 whitespace-pre-line text-gray-800">{n.details}</p>
              {n.link_url && (
                <a
                  href={n.link_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-4 inline-block rounded border border-du-blue px-4 py-2 text-sm font-semibold text-du-blue hover:bg-blue-50"
                >
                  Open link ↗
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}