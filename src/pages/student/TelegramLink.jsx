import { useCallback, useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../../lib/supabase'
import { TELEGRAM_BOT_USERNAME } from '../../lib/config'

const botReady = !!TELEGRAM_BOT_USERNAME && !TELEGRAM_BOT_USERNAME.startsWith('PUT_')

export default function TelegramLink() {
  const [linked, setLinked] = useState(undefined) // undefined = checking
  const [code, setCode] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const check = useCallback(async () => {
    const { data } = await supabase.rpc('my_telegram_status')
    const value = data === true
    setLinked(value)
    return value
  }, [])

  useEffect(() => {
    check()
  }, [check])

  // While the link panel is open, check every few seconds
  useEffect(() => {
    if (!code) return
    const id = setInterval(async () => {
      if (await check()) setCode(null)
    }, 4000)
    return () => clearInterval(id)
  }, [code, check])

  async function start() {
    setError('')
    setBusy(true)
    const { data, error: e } = await supabase.rpc('new_telegram_link')
    setBusy(false)
    if (e) return setError(e.message)
    setCode(data)
  }

  async function copyCommand() {
    await navigator.clipboard.writeText(`/start ${code}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!botReady || linked === undefined) return null

  if (linked) {
    return <p className="mb-4 text-sm font-semibold text-du-green-dark">✈️ Telegram linked ✔</p>
  }

  const link = code ? `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${code}` : null

  return (
    <div className="mb-5 rounded-lg border-2 border-du-blue bg-blue-50 p-4">
      <h3 className="font-bold text-du-blue">✈️ Link your Telegram</h3>
      <p className="mt-1 text-sm text-gray-700">
        Receive notices and password resets in Telegram, and contact the Incubation Center through the bot.
      </p>

      {!code ? (
        <>
          {error && <p className="mt-2 text-sm text-du-red">{error}</p>}
          <button
            onClick={start}
            disabled={busy}
            className="mt-3 rounded bg-du-blue px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {busy ? 'Preparing...' : 'Link Telegram'}
          </button>
        </>
      ) : (
        <div className="mt-3">
          <a
            href={link}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-block rounded bg-du-blue px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Open Telegram and link my account
          </a>
          <p className="mt-2 text-xs text-gray-600">
            In Telegram, press <b>Start</b>. This page updates by itself when the link is done.
          </p>

          <div className="mt-3 flex justify-center">
            <div className="rounded bg-white p-2">
              <QRCodeSVG value={link} size={120} level="M" />
            </div>
          </div>
          <p className="mt-1 text-center text-xs text-gray-500">On a computer? Scan this code with your phone camera.</p>

          <p className="mt-3 text-xs text-gray-600">
            If the button does not work, open @{TELEGRAM_BOT_USERNAME} and send this message:
          </p>
          <div className="mt-1 flex items-center gap-2">
            <code className="break-all rounded bg-white px-2 py-1 text-xs">/start {code}</code>
            <button
              type="button"
              onClick={copyCommand}
              className="shrink-0 rounded border border-du-blue px-2 py-1 text-xs font-semibold text-du-blue hover:bg-white"
            >
              {copied ? 'Copied ✔' : 'Copy'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}