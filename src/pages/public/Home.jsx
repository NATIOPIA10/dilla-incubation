import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { ArrowRight, Award, BadgeCheck, DoorOpen, ListChecks, Megaphone, QrCode } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import usePageTitle from '../../lib/usePageTitle'

const ICONS = [DoorOpen, ListChecks, QrCode, Award, Megaphone, BadgeCheck]

const STEPS = [
  ['Register', 'Apply while registration is open, with your university ID photo, phone number, and project titles.'],
  ['Get approved', 'The center reviews your registration and sends you your login.'],
  ['Complete your profile', 'Add your photo and details, and receive your incubation ID card.'],
  ['Build your project', 'Get a seat, report your progress, and keep your project titles up to date.'],
  ['Earn recognition', 'Verified projects are showcased, and graduates receive a certificate.'],
]

const STAT_LABELS = [
  ['members', 'Members'],
  ['projects', 'Verified projects'],
  ['deployed', 'Deployed projects'],
  ['rights', 'Copyright and patent rights'],
]

const imageUrl = (path) => supabase.storage.from('announcement-images').getPublicUrl(path).data.publicUrl

export default function Home() {
  usePageTitle('')
  const { content } = useOutletContext()
  const [win, setWin] = useState(undefined) // undefined = loading, null = closed
  const [stats, setStats] = useState(null)
  const [news, setNews] = useState([])

  useEffect(() => {
    supabase
      .from('registration_windows')
      .select('title, closes_at')
      .order('opens_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setWin(data ?? null))

    supabase
      .from('public_stats')
      .select('*')
      .maybeSingle()
      .then(({ data }) => setStats(data ?? null))

    supabase
      .from('public_news')
      .select('id, title, details, event_date, image_path, created_at')
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => setNews(data ?? []))
  }, [])

  const statItems = stats
    ? STAT_LABELS.map(([key, label]) => ({ label, value: Number(stats[key] ?? 0) })).filter((s) => s.value > 0)
    : []

  return (
    <div>
      {/* Hero */}
      <section
        className="text-white"
        style={{ background: 'linear-gradient(135deg, #2F6B2F 0%, #3F8A3C 60%, #1F7A3A 100%)' }}
      >
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          {win !== undefined && (
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1 text-sm font-semibold">
              <span className={`h-2 w-2 rounded-full ${win ? 'bg-green-300' : 'bg-gray-300'}`} />
              {win
                ? `Registration is open until ${new Date(win.closes_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}`
                : 'Registration is currently closed'}
            </span>
          )}
          <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-tight md:text-5xl">{content.home.headline}</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/90">{content.home.intro}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-du-gold px-6 py-3 font-bold text-du-green-dark hover:opacity-90"
            >
              Register now <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link
              to="/login"
              className="rounded-lg border border-white/70 px-6 py-3 font-semibold hover:bg-white/10"
            >
              Student login
            </Link>
          </div>
        </div>
      </section>

      {/* Numbers */}
      {statItems.length > 0 && (
        <section className="bg-white shadow-sm">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 md:grid-cols-4">
            {statItems.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-4xl font-bold text-du-green-dark">{s.value.toLocaleString('en-GB')}</div>
                <div className="mt-1 text-sm text-gray-600">{s.label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* What we offer */}
      {content.offer.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-2xl font-bold text-du-green-dark">What we offer</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {content.offer.map((o, i) => {
              const Icon = ICONS[i % ICONS.length]
              return (
                <div key={`${o.title}-${i}`} className="rounded-xl border-t-4 border-du-green bg-white p-5 shadow">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-du-green/10 text-du-green-dark">
                    <Icon size={22} aria-hidden="true" />
                  </div>
                  <h3 className="font-bold text-du-green-dark">{o.title}</h3>
                  <p className="mt-1 text-sm text-gray-700">{o.text}</p>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Latest news */}
      {news.length > 0 && (
        <section className="bg-white py-14">
          <div className="mx-auto max-w-6xl px-4">
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-2xl font-bold text-du-green-dark">Latest news</h2>
              <Link to="/news" className="text-sm font-semibold text-du-blue hover:underline">All news →</Link>
            </div>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {news.map((n) => (
                <Link
                  key={n.id}
                  to="/news"
                  className="overflow-hidden rounded-xl border border-gray-200 bg-du-bg shadow-sm hover:shadow-md"
                >
                  {n.image_path && (
                    <img src={imageUrl(n.image_path)} alt="" className="h-40 w-full object-cover" loading="lazy" />
                  )}
                  <div className="p-4">
                    <div className="text-xs text-gray-400">{new Date(n.created_at).toLocaleDateString('en-GB')}</div>
                    <h3 className="mt-1 font-bold text-du-green-dark">{n.title}</h3>
                    <p className="mt-1 line-clamp-3 text-sm text-gray-700">{n.details}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className={news.length > 0 ? 'py-14' : 'bg-white py-14'}>
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-bold text-du-green-dark">How it works</h2>
          <ol className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map(([title, text], i) => (
              <li key={title} className={`rounded-xl p-4 ${news.length > 0 ? 'bg-white shadow' : 'bg-du-bg'}`}>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-du-green font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-3 font-bold text-du-green-dark">{title}</h3>
                <p className="mt-1 text-sm text-gray-700">{text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm">
            <Link to="/about" className="font-semibold text-du-blue hover:underline">
              Learn more about the center →
            </Link>
          </p>
        </div>
      </section>

      {/* Call to action */}
      <section className="bg-du-green-dark text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-10">
          <div>
            <h2 className="text-2xl font-bold">Ready to build your project?</h2>
            <p className="mt-1 text-white/80">Register when the next intake opens, or log in if you are already a member.</p>
          </div>
          <div className="flex gap-3">
            <Link to="/register" className="rounded-lg bg-du-gold px-6 py-3 font-bold text-du-green-dark hover:opacity-90">
              Register
            </Link>
            <Link to="/login" className="rounded-lg border border-white/70 px-6 py-3 font-semibold hover:bg-white/10">
              Login
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}