import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Clock, Mail, MapPin, Menu, Phone, Send, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { mergeContent } from '../lib/siteDefaults'

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

export default function PublicLayout() {
  const { pathname } = useLocation()
  const { session, isAdmin } = useAuth()
  const [content, setContent] = useState(() => mergeContent([]))
  const [open, setOpen] = useState(false)
  const [logoOk, setLogoOk] = useState(true)

  useEffect(() => {
    supabase
      .from('site_content')
      .select('key, value')
      .then(({ data }) => setContent(mergeContent(data ?? [])))
  }, [])

  // A new page starts at the top, and the phone menu closes
  useEffect(() => {
    setOpen(false)
    window.scrollTo(0, 0)
  }, [pathname])

  const dashboard = isAdmin ? '/admin' : '/student'
  const c = content.contact
  const tg = (c.telegram || '').replace(/^@/, '')
  const contactLines = [
    c.office && { Icon: MapPin, text: c.office },
    c.hours && { Icon: Clock, text: c.hours },
    c.phone && { Icon: Phone, text: c.phone },
    c.email && { Icon: Mail, text: c.email },
    tg && { Icon: Send, text: `@${tg}` },
  ].filter(Boolean)

  const accountButton = session ? (
    <Link
      to={dashboard}
      className="rounded bg-du-gold px-4 py-1.5 text-sm font-bold text-du-green-dark hover:opacity-90"
    >
      Dashboard
    </Link>
  ) : (
    <Link
      to="/login"
      className="rounded bg-du-gold px-4 py-1.5 text-sm font-bold text-du-green-dark hover:opacity-90"
    >
      Login
    </Link>
  )

  return (
    <div className="flex min-h-screen flex-col bg-du-bg">
      <header className="sticky top-0 z-30 bg-du-green text-white shadow">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-3">
            {logoOk ? (
              <img src="/logo.png" alt="" className="h-11 w-11 object-contain" onError={() => setLogoOk(false)} />
            ) : (
              <span className="flex h-11 w-11 items-center justify-center rounded bg-white/15 font-bold">DU</span>
            )}
            <div className="leading-tight">
              <div className="text-lg font-bold tracking-wide">DILLA UNIVERSITY</div>
              <div className="text-xs text-du-gold">Incubation Center</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-semibold md:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `border-b-2 pb-1 ${
                    isActive ? 'border-du-gold text-white' : 'border-transparent text-white/80 hover:text-white'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              to="/register"
              className="rounded border border-white/70 px-4 py-1.5 text-sm font-semibold hover:bg-white/10"
            >
              Register
            </Link>
            {accountButton}
          </div>

          <button
            className="rounded p-1 hover:bg-white/10 md:hidden"
            onClick={() => setOpen(!open)}
            aria-label={open ? 'Close the menu' : 'Open the menu'}
          >
            {open ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>

        {open && (
          <div className="border-t border-white/20 px-4 pb-4 md:hidden">
            <nav className="flex flex-col py-2 text-base font-semibold">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    `rounded px-2 py-2 ${isActive ? 'bg-white/15' : 'text-white/90 hover:bg-white/10'}`
                  }
                >
                  {n.label}
                </NavLink>
              ))}
            </nav>
            <div className="mt-2 flex gap-3">
              <Link
                to="/register"
                className="flex-1 rounded border border-white/70 px-4 py-2 text-center text-sm font-semibold hover:bg-white/10"
              >
                Register
              </Link>
              <div className="flex-1 text-center [&>a]:block [&>a]:py-2">{accountButton}</div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet context={{ content }} />
      </main>

      <footer className="bg-du-green-dark text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
          <div>
            <div className="text-lg font-bold tracking-wide">DILLA UNIVERSITY</div>
            <div className="text-sm text-du-gold">Incubation Center</div>
            <p className="mt-3 text-sm text-white/70">University of the Green Land</p>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/60">Links</p>
            <ul className="space-y-1 text-sm">
              {NAV.map((n) => (
                <li key={n.to}>
                  <Link to={n.to} className="text-white/85 hover:text-white">{n.label}</Link>
                </li>
              ))}
              <li><Link to="/register" className="text-white/85 hover:text-white">Register</Link></li>
              <li><Link to="/login" className="text-white/85 hover:text-white">Login</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/60">Contact</p>
            {contactLines.length === 0 ? (
              <p className="text-sm text-white/70">Contact details will be published soon.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {contactLines.map(({ Icon, text }) => (
                  <li key={text} className="flex gap-2 text-white/85">
                    <Icon size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="border-t border-white/15 py-4 text-center text-xs text-white/60">
          © {new Date().getFullYear()} Dilla University. All rights reserved.
        </div>
      </footer>
    </div>
  )
}