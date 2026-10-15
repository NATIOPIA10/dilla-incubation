import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Header() {
  const { session, isAdmin } = useAuth()
  const navigate = useNavigate()

  async function logout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <header className="bg-du-green text-white shadow">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt=""
            className="h-12 w-12 object-contain"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
          <div className="leading-tight">
            <div className="text-xl font-bold tracking-wide">DILLA UNIVERSITY</div>
            <div className="text-sm text-du-gold">Incubation Center</div>
          </div>
        </Link>

        <nav className="flex items-center gap-5 text-sm font-semibold">
          {!session && (
            <>
              <Link to="/" className="hover:text-du-gold">Login</Link>
              <Link to="/register" className="hover:text-du-gold">Register</Link>
            </>
          )}
          {session && (
            <>
              <Link to={isAdmin ? '/admin' : '/student'} className="hover:text-du-gold">
                Dashboard
              </Link>
              <button
                onClick={logout}
                className="rounded border border-white/70 px-3 py-1 hover:bg-white/10"
              >
                Log out
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}