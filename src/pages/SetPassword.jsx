import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

async function functionError(e) {
  let msg = e.message
  try {
    const body = await e.context.json()
    if (body?.error) msg = body.error
  } catch { /* keep the generic message */ }
  return msg
}

export default function SetPassword() {
  const { token } = useParams()
  const [info, setInfo] = useState(undefined) // undefined = loading, null = invalid
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(null)

  useEffect(() => {
    supabase.functions
      .invoke('set-password', { body: { action: 'check', token } })
      .then(({ data, error: e }) => setInfo(!e && data?.valid ? data : null))
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('Use at least 8 characters.')
    if (password !== confirm) return setError('The two passwords do not match.')

    setLoading(true)
    const { data, error: err } = await supabase.functions.invoke('set-password', { body: { token, password } })
    setLoading(false)
    if (err) return setError(await functionError(err))
    setDone(data)
  }

  const input =
    'w-full mb-4 rounded border border-gray-300 bg-blue-50 px-3 py-2 focus:outline-none focus:border-du-green'

  if (info === undefined) return <p className="p-10 text-center text-gray-500">Loading...</p>

  if (info === null) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <div className="rounded border-t-4 border-du-maroon bg-white p-8 shadow">
          <h1 className="mb-2 text-2xl font-bold text-du-maroon">This link is not valid</h1>
          <p className="mb-4 text-gray-600">
            The link may have expired or was already used. Please contact the Incubation Center to get a new one.
          </p>
          <Link to="/" className="text-du-green-dark underline">Back to the home page</Link>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <div className="rounded border-t-4 border-du-green bg-white p-8 shadow">
          <h1 className="mb-2 text-2xl font-bold text-du-green-dark">Password set ✔</h1>
          <p className="mb-1 text-gray-600">You can now log in with your username:</p>
          <p className="mb-4 font-mono text-xl font-bold text-du-maroon">{done.username}</p>
          <Link
            to="/"
            className="inline-block rounded bg-du-green-dark px-6 py-2 font-semibold text-white hover:bg-du-green"
          >
            Go to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <form onSubmit={handleSubmit} className="rounded border-t-4 border-du-green bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-du-green-dark">Set your password</h1>
        <p className="mb-5 text-sm text-gray-500">
          Your username is <b className="font-mono text-du-maroon">{info.username}</b>. Choose a password you will
          remember, and do not share it with anyone.
        </p>

        <label className="mb-1 block text-sm text-gray-600">New password</label>
        <input type="password" className={input} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />

        <label className="mb-1 block text-sm text-gray-600">Confirm new password</label>
        <input type="password" className={input} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />

        <p className="mb-4 text-xs text-gray-500">At least 8 characters. Mix letters and numbers.</p>
        {error && <p className="mb-3 text-sm text-du-red">{error}</p>}

        <button
          disabled={loading}
          className="w-full rounded bg-du-green-dark py-2 font-semibold text-white hover:bg-du-green disabled:opacity-60"
        >
          {loading ? 'Saving...' : 'Save password'}
        </button>
      </form>
    </div>
  )
}