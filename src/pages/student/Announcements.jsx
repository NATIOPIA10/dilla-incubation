import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const publicUrl = (path) =>
  supabase.storage.from('announcement-images').getPublicUrl(path).data.publicUrl

export default function Announcements() {
  const [events, setEvents] = useState(undefined)

  useEffect(() => {
    supabase
      .from('events')
      .select('id, title, details, event_date, location, link_url, image_path, created_at')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setEvents(data ?? []))
  }, [])

  if (events === undefined) return <p className="text-gray-400">Loading...</p>

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-du-green-dark">📢 Announcements</h2>
      {events.length === 0 && <p className="text-sm text-gray-400">No announcements yet.</p>}
      <div className="space-y-4">
        {events.map((ev) => (
          <div key={ev.id} className="overflow-hidden rounded-lg border-l-4 border-du-green bg-white shadow">
            {ev.image_path && (
              <a href={publicUrl(ev.image_path)} target="_blank" rel="noreferrer noopener">
                <img src={publicUrl(ev.image_path)} alt="" className="max-h-72 w-full object-cover" />
              </a>
            )}
            <div className="p-4">
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
              {ev.link_url && (
                <a href={ev.link_url} target="_blank" rel="noreferrer noopener"
                  className="mt-3 inline-block rounded border border-du-blue px-3 py-1 text-sm font-semibold text-du-blue hover:bg-blue-50">
                  Open link ↗
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}