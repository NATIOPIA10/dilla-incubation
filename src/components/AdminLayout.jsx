import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Award,
  BadgeCheck,
  CalendarDays,
  ClipboardList,
  DoorOpen,
  GraduationCap,
  Globe,
  ImagePlus,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  QrCode,
  UserCheck,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const GROUPS = [
  {
    title: 'Overview',
    items: [{ to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    title: 'Applicants and students',
    items: [
      { to: '/admin/registrations', label: 'Registrations', icon: ClipboardList, badge: 'registrations' },
      { to: '/admin/profiles', label: 'Profiles', icon: UserCheck, badge: 'profiles' },
      { to: '/admin/students', label: 'Students', icon: GraduationCap },
      { to: '/admin/photos', label: 'Photo changes', icon: ImagePlus, badge: 'photos' },
    ],
  },
  {
    title: 'Center',
    items: [
      { to: '/admin/rooms', label: 'Rooms', icon: DoorOpen },
      { to: '/admin/events', label: 'Announcements', icon: Megaphone },
      { to: '/admin/support', label: 'Support', icon: MessageSquare, badge: 'support' },
    ],
  },
  {
    title: 'Projects',
    items: [
      { to: '/admin/status', label: 'Project status', icon: ListChecks },
      { to: '/admin/verification', label: 'Projects and rights', icon: BadgeCheck, badge: 'verification' },
      { to: '/admin/certificates', label: 'Certificates', icon: Award },
    ],
  },
  {
    title: 'Website',
    items: [{ to: '/admin/website', label: 'Website content', icon: Globe }],
  },
  {
    title: 'Registration setup',
    items: [
      { to: '/admin/windows', label: 'Registration dates', icon: CalendarDays },
      { to: '/admin/poster', label: 'Registration poster', icon: QrCode },
    ],
  },
]

const ALL_ITEMS = GROUPS.flatMap((g) => g.items)

// Numbers of things that are waiting for the admin (refreshed every minute and on every page change)
function useBadges(pathname) {
  const [counts, setCounts] = useState({})

  const load = useCallback(async () => {
    const head = { count: 'exact', head: true }
    const [reg, prof, sup, photo, proj, ip] = await Promise.all([
      supabase.from('students').select('id', head).eq('status', 'pending').is('correction_reason', null),
      supabase.from('students').select('id', head).eq('profile_status', 'submitted'),
      supabase.from('support_messages').select('id', head).eq('direction', 'in').is('read_at', null),
      supabase.from('photo_change_requests').select('id', head).eq('status', 'pending'),
      supabase.from('projects').select('id', head).eq('verification_status', 'pending'),
      supabase.from('ip_records').select('id', head).eq('verification_status', 'pending'),
    ])
    setCounts({
      registrations: reg.count ?? 0,
      profiles: prof.count ?? 0,
      support: sup.count ?? 0,
      photos: photo.count ?? 0,
      verification: (proj.count ?? 0) + (ip.count ?? 0),
    })
  }, [])

  useEffect(() => {
    load()
  }, [load, pathname])

  useEffect(() => {
    const id = setInterval(load, 60000)
    return () => clearInterval(id)
  }, [load])

  return counts
}

// "md:hidden" hides a part only in the compact computer sidebar. On a phone everything is always shown.
function SidebarNav({ counts, collapsed, onNavigate }) {
  return (
    <nav className="space-y-4 px-3 py-4">
      {GROUPS.map((g, gi) => (
        <div key={g.title}>
          <p
            className={`mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/50 ${
              collapsed ? 'md:hidden' : ''
            }`}
          >
            {g.title}
          </p>
          {collapsed && gi > 0 && <div className="mb-2 hidden border-t border-white/15 md:block" />}
          <ul className="space-y-0.5">
            {g.items.map((it) => {
              const Icon = it.icon
              const n = counts[it.badge] ?? 0
              return (
                <li key={it.to}>
                  <NavLink
                    to={it.to}
                    end={it.end}
                    onClick={onNavigate}
                    title={it.label}
                    className={({ isActive }) =>
                      `relative flex items-center gap-3 rounded-lg border-l-4 px-3 py-2 text-sm font-semibold transition-colors ${
                        collapsed ? 'md:justify-center md:px-0' : ''
                      } ${
                        isActive
                          ? 'border-du-gold bg-white/15 text-white'
                          : 'border-transparent text-white/80 hover:bg-white/10 hover:text-white'
                      }`
                    }
                  >
                    <Icon size={18} strokeWidth={2} className="shrink-0" aria-hidden="true" />
                    <span className={`flex-1 truncate ${collapsed ? 'md:hidden' : ''}`}>{it.label}</span>
                    {n > 0 && (
                      <>
                        <span
                          className={`rounded-full bg-du-red px-2 py-0.5 text-xs font-bold text-white ${
                            collapsed ? 'md:hidden' : ''
                          }`}
                        >
                          {n}
                        </span>
                        {collapsed && (
                          <span className="absolute right-2 top-1.5 hidden h-2.5 w-2.5 rounded-full bg-du-red md:block" />
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

export default function AdminLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { session } = useAuth()
  const counts = useBadges(pathname)
  const [open, setOpen] = useState(false)
  const [logoOk, setLogoOk] = useState(true)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('admin-sidebar') === 'compact'
    } catch {
      return false
    }
  })

  // Close the phone menu when a page is opened
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Escape closes the phone menu
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    try {
      localStorage.setItem('admin-sidebar', next ? 'compact' : 'wide')
    } catch { /* the choice is simply not remembered */ }
  }

  async function logout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  const path = pathname.replace(/\/+$/, '') || '/admin'
  const current = ALL_ITEMS.find((it) => (it.end ? path === it.to : path.startsWith(it.to)))
  const title = current?.label ?? 'Admin'
  const anyWaiting = Object.values(counts).some((n) => n > 0)
  const email = session?.user?.email ?? ''

  return (
    <div className="admin-shell fixed inset-0 z-30 flex bg-du-bg">
      {/* Phone: dark area behind the drawer */}
      {open && (
        <div className="admin-chrome fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar (a drawer on a phone) */}
      <aside
        className={`admin-chrome fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85%] flex-col bg-du-green-dark text-white shadow-xl transition-transform duration-200 md:static md:z-auto md:max-w-none md:translate-x-0 md:shadow-none ${
          open ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'md:w-[72px]' : 'md:w-64'}`}
      >
        <div className="flex h-14 shrink-0 items-center border-b border-white/15">
          <Link
            to="/admin"
            className={`flex min-w-0 flex-1 items-center gap-3 px-4 ${collapsed ? 'md:justify-center md:px-0' : ''}`}
          >
            {logoOk ? (
              <img src="/logo.png" alt="" className="h-9 w-9 shrink-0 object-contain" onError={() => setLogoOk(false)} />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-white/15 text-sm font-bold">
                DU
              </span>
            )}
            <div className={`min-w-0 leading-tight ${collapsed ? 'md:hidden' : ''}`}>
              <div className="truncate text-sm font-bold tracking-wide">DILLA UNIVERSITY</div>
              <div className="truncate text-[11px] text-du-gold">Incubation Center · Admin</div>
            </div>
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="mr-3 rounded p-1 text-white/70 hover:bg-white/10 hover:text-white md:hidden"
            aria-label="Close the menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <SidebarNav counts={counts} collapsed={collapsed} onNavigate={() => setOpen(false)} />
        </div>

        <div className="shrink-0 border-t border-white/15 p-3">
          {email && (
            <div className={`mb-2 truncate px-1 text-xs text-white/70 ${collapsed ? 'md:hidden' : ''}`} title={email}>
              {email}
            </div>
          )}
          <button
            onClick={logout}
            title="Log out"
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white ${
              collapsed ? 'md:justify-center md:px-0' : ''
            }`}
          >
            <LogOut size={18} className="shrink-0" aria-hidden="true" />
            <span className={collapsed ? 'md:hidden' : ''}>Log out</span>
          </button>
          <button
            onClick={toggleCollapsed}
            title={collapsed ? 'Expand menu' : 'Collapse menu'}
            className={`mt-1 hidden w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white md:flex ${
              collapsed ? 'md:justify-center md:px-0' : ''
            }`}
          >
            {collapsed ? (
              <PanelLeftOpen size={18} className="shrink-0" aria-hidden="true" />
            ) : (
              <PanelLeftClose size={18} className="shrink-0" aria-hidden="true" />
            )}
            <span className={collapsed ? 'md:hidden' : ''}>Collapse menu</span>
          </button>
        </div>
      </aside>

      {/* Top bar and the page */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="admin-chrome flex h-14 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4">
          <button
            onClick={() => setOpen(true)}
            className="relative flex items-center gap-2 rounded border border-du-green-dark px-3 py-1.5 text-sm font-semibold text-du-green-dark hover:bg-green-50 md:hidden"
            aria-label="Open the menu"
          >
            <Menu size={18} aria-hidden="true" />
            Menu
            {anyWaiting && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-du-red" />}
          </button>
          <h1 className="truncate text-lg font-bold text-du-green-dark">{title}</h1>
          <span className="ml-auto hidden text-sm text-gray-500 sm:block">{email}</span>
        </header>

        <main className="admin-scroll flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}