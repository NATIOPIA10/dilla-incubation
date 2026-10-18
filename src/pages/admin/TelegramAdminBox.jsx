import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function TelegramAdminBox({ studentId }) {
  const [linked, setLinked] = useState(undefined)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('telegram_links')
      .select('linked_at')
      .eq('student_id', studentId)
      .maybeSingle()
    setLinked(!!data?.linked_at)
  }, [studentId])

  useEffect(() => {
    load()
  }, [load])

  async function unlink() {
    if (!window.confirm(
      'Unlink this student\u2019s Telegram? They will need to link again from their dashboard. Do this only after checking who is asking, for example when the student has a new phone.'
    )) return
    setError('')
    setBusy(true)
    const { error: e } = await supabase.rpc('admin_unlink_telegram', { p_student: studentId })
    setBusy(false)
    if (e) return setError(e.message)
    load()
  }

  if (linked === undefined) return null

  return (
    <div className="mt-3 rounded border border-du-blue/30 bg-blue-50 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold">
          ✈️ Telegram:{' '}
          {linked ? (
            <span className="text-du-green-dark">Linked ✔</span>
          ) : (
            <span className="text-gray-500">Not linked</span>
          )}
        </span>
        {linked && (
          <span className="flex gap-3">
            <Link to={`/admin/support?student=${studentId}`} className="text-du-blue hover:underline">
              Open chat
            </Link>
            <button onClick={unlink} disabled={busy} className="text-du-red hover:underline disabled:opacity-50">
              Unlink
            </button>
          </span>
        )}
      </div>
      {error && <p className="mt-1 text-du-red">{error}</p>}
    </div>
  )
}