import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ContactBox from '../components/ContactBox'

const cards = [
  { icon: '📝', title: 'New Student Registration', text: 'Students from the 2nd to the 5th year can register when registration is open.', to: '/register' },
  { icon: '🎓', title: 'Student Dashboard', text: 'Log in to update your profile, see your room, and submit project status.' },
  { icon: '📢', title: 'Announcements', text: 'Events and notices are posted here and on our Telegram channel.' },
]

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Admins log in with a real email; students with their incubation ID (DUIC-0472/26)
    const id = username.trim().toLowerCase()
    const email = id.includes('@')
      ? id
      : `${id.replace(/\s+/g, '').replace(/\//g, '-')}@inc.local`

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setLoading(false)
      setError('Wrong username or password.')
      return
    }

    const { data: admin } = await supabase
      .from('admins')
      .select('id')
      .eq('id', data.user.id)
      .maybeSingle()

    setLoading(false)
    navigate(admin ? '/admin' : '/student')
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 grid gap-8 md:grid-cols-2">
      {/* Left: info cards */}
      <section>
        <p className="text-du-green-dark leading-relaxed mb-6">
          <span className="float-left text-6xl font-bold text-du-maroon leading-none pr-2">T</span>
          his portal is designed to provide services for students and staff of the
          Dilla University Incubation Center.
        </p>
        <div className="space-y-4 clear-both">
          {cards.map((c) => {
            const body = (
              <div className="flex items-center gap-4 rounded-lg bg-du-blue p-4 shadow">
                <div className="h-14 w-14 shrink-0 rounded-full bg-white/90 flex items-center justify-center text-2xl">
                  {c.icon}
                </div>
                <div>
                  <h3 className="font-bold text-du-gold">{c.title}</h3>
                  <p className="text-sm text-white">{c.text}</p>
                </div>
              </div>
            )
            return c.to ? <Link key={c.title} to={c.to}>{body}</Link> : <div key={c.title}>{body}</div>
          })}
        </div>
      </section>

      {/* Right: logo + login form */}
      <section className="flex flex-col items-center">
        <img
          src="/logo.png"
          alt="Dilla University"
          className="h-40 object-contain mb-4"
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm bg-white border-t-4 border-du-green rounded shadow p-6"
        >
          <h2 className="text-lg text-gray-600 mb-4">Login to your account</h2>

          <label className="block text-sm text-gray-600 mb-1">Username (your incubation ID)</label>
          <input
            className="w-full mb-1 rounded border border-gray-300 bg-blue-50 px-3 py-2 focus:outline-none focus:border-du-green"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            placeholder="e.g. DUIC-0472/26"
            required
          />
          <p className="text-xs text-gray-500 mb-4">Admins: use your email address.</p>

          <label className="block text-sm text-gray-600 mb-1">Password</label>
          <input
            type="password"
            className="w-full mb-4 rounded border border-gray-300 bg-blue-50 px-3 py-2 focus:outline-none focus:border-du-green"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          {error && <p className="text-sm text-du-red mb-3">{error}</p>}

          <button
            disabled={loading}
            className="w-full rounded bg-du-green-dark py-2 font-semibold text-white hover:bg-du-green disabled:opacity-60"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
                    <p className="mt-3 text-sm text-gray-500">
            Forgot your password? Contact the Incubation Center (details below).
          </p>
        </form>
                <ContactBox className="mt-4 w-full max-w-sm" />
      </section>
    </div>
  )
}
