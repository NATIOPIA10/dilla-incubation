import { useCallback, useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import IdCard from '../../components/IdCard'
import ChangePassword from './ChangePassword'
import ProfileForm from './ProfileForm'
import Overview from './Overview'
import Announcements from './Announcements'
import ProjectStatus from './ProjectStatus'
import ProjectTitles from './ProjectTitles'
import Portfolio from './Portfolio'
import Showcase from './Showcase'
import Account from './Account'

const TABS = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'id', label: 'ID card', icon: '🪪' },
  { key: 'news', label: 'News', icon: '📢' },
  { key: 'status', label: 'Status', icon: '📋' },
  { key: 'work', label: 'My work', icon: '🚀' },
  { key: 'password', label: 'Password', icon: '🔐' },
  { key: 'showcase', label: 'Showcase', icon: '🌟' },
]

function Card({ title, children, tone = 'green' }) {
  return (
    <div className="max-w-xl mx-auto p-8 text-center">
      <div className={`bg-white border-t-4 rounded shadow p-8 ${tone === 'red' ? 'border-du-maroon' : 'border-du-green'}`}>
        <h1 className="text-2xl font-bold text-du-green-dark mb-2">{title}</h1>
        <div className="text-gray-600">{children}</div>
      </div>
    </div>
  )
}

function Dashboard({ student }) {
  const [params, setParams] = useSearchParams()
  const [incubationId, setIncubationId] = useState(null)
  const [work, setWork] = useState('titles')

  const requested = params.get('tab')
    const tab = TABS.some((t) => t.key === requested) || requested === 'account' ? requested : 'home'

  const go = (key, sub) => {
    if (sub) setWork(sub)
    setParams(key === 'home' ? {} : { tab: key })
    window.scrollTo({ top: 0 })
  }

  useEffect(() => {
    supabase.rpc('incubation_id', { p_student: student.id }).then(({ data }) => setIncubationId(data))
  }, [student.id])

  const desktopTab = (t) => (
    <button
      key={t.key}
      onClick={() => go(t.key)}
      className={`rounded-full px-4 py-2 text-sm font-semibold ${
        tab === t.key
          ? 'bg-du-green text-white'
          : 'border border-gray-300 bg-white text-gray-600 hover:border-du-green'
      }`}
    >
      {t.icon} {t.label}
    </button>
  )

  const mobileTab = (t) => (
    <button
      key={t.key}
      onClick={() => go(t.key)}
      className={`flex flex-1 flex-col items-center gap-0.5 border-t-4 py-2 text-[11px] font-semibold ${
        tab === t.key ? 'border-du-green text-du-green-dark' : 'border-transparent text-gray-500'
      }`}
    >
      <span className="text-xl leading-none">{t.icon}</span>
      {t.label}
    </button>
  )

  return (
    <div className="pb-24 md:pb-0">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-6 hidden flex-wrap gap-2 md:flex">{TABS.map(desktopTab)}</div>

        {tab === 'home' && <Overview student={student} incubationId={incubationId} go={go} />}

        {tab === 'id' && (
          <div>
            <h2 className="mb-4 text-xl font-bold text-du-green-dark">🪪 My incubation center ID card</h2>
            {incubationId ? (
              <IdCard student={student} incubationId={incubationId} />
            ) : (
              <p className="text-gray-400">Loading your ID card...</p>
            )}
          </div>
        )}

        {tab === 'news' && <Announcements />}
        {tab === 'showcase' && <Showcase />}
        {tab === 'account' && <Account student={student} go={go} />}
        {tab === 'status' && (
          <div>
            <h2 className="mb-4 text-xl font-bold text-du-green-dark">📋 Project status</h2>
            <ProjectStatusWrapper student={student} />
          </div>
        )}

        {tab === 'work' && (
          <div>
            <div className="mb-2 flex gap-2">
              {[
                ['titles', '💡 Project titles'],
                ['projects', '🚀 Projects and rights'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setWork(key)}
                  className={`rounded-full px-4 py-1 text-sm font-semibold ${
                    work === key
                      ? 'bg-du-blue text-white'
                      : 'border border-gray-300 bg-white text-gray-600 hover:border-du-blue'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {work === 'titles' ? <ProjectTitles student={student} /> : <Portfolio student={student} />}
          </div>
        )}

        {tab === 'password' && <ChangePassword />}
      </div>

      {/* Phone: bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-gray-200 bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.08)] md:hidden">
        {TABS.map(mobileTab)}
      </nav>
    </div>
  )
}

// The status page already has its own heading, so it only needs a small wrapper
function ProjectStatusWrapper({ student }) {
  return (
    <div className="-mt-8">
      <ProjectStatus student={student} />
    </div>
  )
}

function UnderReview({ onChanged }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function editAgain() {
    if (!window.confirm('Cancel your submission and edit your profile again? You will need to submit it again for review.')) return
    setError('')
    setBusy(true)
    const { error: e } = await supabase.rpc('withdraw_profile')
    setBusy(false)
    if (e) return setError(e.message)
    onChanged()
  }

  return (
    <Card title="Profile under review">
      <p>Thank you. The admin is reviewing your profile. Your ID card will be released once it is approved.</p>
      <p className="mt-4 text-sm text-gray-500">Did you make a mistake, for example a wrong photo?</p>
      {error && <p className="mt-2 text-sm text-du-red">{error}</p>}
      <button
        disabled={busy}
        onClick={editAgain}
        className="mt-2 rounded border border-du-blue px-4 py-2 text-sm font-semibold text-du-blue hover:bg-blue-50 disabled:opacity-60"
      >
        {busy ? 'Working...' : 'Edit my profile again'}
      </button>
    </Card>
  )
}

export default function StudentHome() {
  const { session, isAdmin, loading: authLoading } = useAuth()
  const [student, setStudent] = useState(undefined) // undefined = loading, null = none
  const [changingPassword, setChangingPassword] = useState(false)
  const userId = session?.user?.id

  const load = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('students')
      .select('*')
      .eq('auth_user_id', userId)
      .maybeSingle()
    setStudent(data ?? null)
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  if (authLoading) return <p className="text-center p-10 text-gray-500">Loading...</p>
  if (!session) return <Navigate to="/login" replace />
  if (isAdmin) return <Navigate to="/admin" replace />
  if (student === undefined) return <p className="text-center p-10 text-gray-500">Loading...</p>

  if (student === null) {
    return <Card title="No student account found" tone="red">Please contact the incubation center admin.</Card>
  }
  if (student.status === 'deactivated') {
    return <Card title="Account closed" tone="red">Your incubation center account is no longer active.</Card>
  }

  if (student.must_change_password) return <ChangePassword onDone={load} requiredChange />

  if (['draft', 'rejected'].includes(student.profile_status)) {
    return changingPassword ? (
      <div>
        <button
          onClick={() => setChangingPassword(false)}
          className="ml-4 mt-4 text-sm font-semibold text-du-blue hover:underline"
        >
          ← Back to profile
        </button>
        <ChangePassword onDone={() => setChangingPassword(false)} />
      </div>
    ) : (
      <>
        <ProfileForm student={student} onChanged={load} />
        <div className="mx-auto max-w-2xl px-4 pb-8 text-right">
          <button
            onClick={() => setChangingPassword(true)}
            className="text-sm font-semibold text-du-blue hover:underline"
          >
            Change password
          </button>
        </div>
      </>
    )
  }

    if (student.profile_status === 'submitted') {
    return <UnderReview onChanged={load} />
  }

  return <Dashboard student={student} />
}