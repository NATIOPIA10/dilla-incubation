import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toPng } from 'html-to-image'
import { supabase } from '../../lib/supabase'
import Certificate from '../../components/Certificate'

export default function CertificateView() {
  const { id } = useParams()
  const [cert, setCert] = useState(undefined)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('certificates')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => setCert(data ?? null))
  }, [id])

  async function download() {
    setBusy(true)
    setError('')
    try {
      const node = document.getElementById('certificate-print')
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        imagePlaceholder:
          'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `${cert.certificate_number}.png`
      a.click()
    } catch {
      setError('Could not create the image. Please use Print / Save as PDF instead.')
    } finally {
      setBusy(false)
    }
  }

  if (cert === undefined) return <p className="text-gray-400">Loading...</p>
  if (cert === null) return <p className="text-du-red">Certificate not found.</p>

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link to="/admin/certificates" className="text-sm text-du-green-dark underline">← Back to certificates</Link>
        <button onClick={download} disabled={busy}
          className="rounded bg-du-green-dark px-4 py-2 text-sm font-semibold text-white hover:bg-du-green disabled:opacity-50">
          {busy ? 'Preparing...' : 'Download image (PNG)'}
        </button>
        <button onClick={() => window.print()}
          className="rounded border border-du-green-dark px-4 py-2 text-sm font-semibold text-du-green-dark hover:bg-green-50">
          Print / Save as PDF
        </button>
      </div>
      {error && <p className="mb-3 text-sm text-du-red">{error}</p>}
      <p className="mb-3 text-xs text-gray-500">
        To save a PDF, click Print, choose "Save as PDF" as the printer, and set margins to "None".
      </p>

      <div className="overflow-x-auto rounded border border-gray-300 bg-gray-100 p-3">
        <Certificate cert={cert} />
      </div>
    </div>
  )
}