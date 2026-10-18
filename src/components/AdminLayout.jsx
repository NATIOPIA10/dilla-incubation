import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/registrations', label: 'Registrations' },
  { to: '/admin/profiles', label: 'Profiles' },
  { to: '/admin/students', label: 'Students' },
  { to: '/admin/rooms', label: 'Rooms' },
  { to: '/admin/events', label: 'Announcements' },
  { to: '/admin/status', label: 'Project status' },
  { to: '/admin/verification', label: 'Projects and rights' },
  { to: '/admin/certificates', label: 'Certificates' },
  { to: '/admin/windows', label: 'Registration dates' },
  { to: '/admin/support', label: 'Support' },
]

export default function AdminLayout() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-du-green-dark mb-4">Admin Dashboard</h1>
      <nav className="flex gap-2 border-b border-gray-300 mb-6 overflow-x-auto">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `px-4 py-2 text-sm font-semibold whitespace-nowrap border-b-4 -mb-px ${
                isActive
                  ? 'border-du-green text-du-green-dark'
                  : 'border-transparent text-gray-500 hover:text-du-green-dark'
              }`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}