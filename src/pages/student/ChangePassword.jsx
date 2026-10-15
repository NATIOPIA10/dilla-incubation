import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function ChangePassword({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('Use at least 8 characters.')
    if (password !== confirm) return setError('The two passwords do not match.')

    setLoading(true)
    const { error: pwError } = await supabase.auth.updateUser({ password })
    if (pwError) {
      setLoading(false)
      return setError(pwError.message)
    }
    const { error: flagError } = await supabase.rpc('complete_password_change')
    setLoading(false)
    if (flagError) return setError(flagError.message)
    onDone()
  }

  const input =
    'w-full mb-4 rounded border border-gray-300 bg-blue-50 px-3 py-2 focus:outline-none focus:border-du-green'

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <form onSubmit={handleSubmit} className="bg-white border-t-4 border-du-green rounded shadow p-6">
        <h1 className="text-2xl font-bold text-du-green-dark">Set your new password</h1>
        <p className="text-sm text-gray-500 mb-5">
          You logged in with a temporary password. Please choose your own password to continue.
        </p>

        <label className="block text-sm text-gray-600 mb-1">New password</label>
        <input type="password" className={input} value={password}
          onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />

        <label className="block text-sm text-gray-600 mb-1">Confirm new password</label>
        <input type="password" className={input} value={confirm}
          onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />

        <p className="text-xs text-gray-500 mb-4">At least 8 characters. Mix letters and numbers.</p>
        {error && <p className="text-sm text-du-red mb-3">{error}</p>}

        <button disabled={loading}
          className="w-full rounded bg-du-green-dark py-2 font-semibold text-white hover:bg-du-green disabled:opacity-60">
          {loading ? 'Saving...' : 'Save password and continue'}
        </button>
      </form>
    </div>
  )
}