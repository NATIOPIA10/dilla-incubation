import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function VerifyCertificate() {
  const { token } = useParams()
  const [result, setResult] = useState(undefined)

  useEffect(() => {
    supabase.rpc('verify_certificate', { p_token: token }).then(({ data }) => {
      setResult(data?.[0] ?? { valid: false })
    })
  }, [token])

  if (result === undefined) return <p className="p-10 text-center text-gray-500">Checking certificate...</p>

  return (
    <div className="mx-auto max-w-md p-8">
      {result.valid ? (
        <div className="rounded border-t-4 border-du-green bg-white p-8 text-center shadow">
          <div className="mb-2 text-5xl">✅</div>
          <h1 className="text-2xl font-bold text-du-green-dark">Genuine certificate</h1>
          <p className="mt-4 text-xl font-bold">{result.full_name}</p>
          <p className="mt-2 font-mono text-lg text-du-maroon">{result.certificate_number}</p>
          <p className="mt-2 text-sm text-gray-500">
            Issued on {new Date(result.issued_at).toLocaleDateString()} by the Dilla University Incubation Center.
          </p>
        </div>
      ) : (
        <div className="rounded border-t-4 border-du-red bg-white p-8 text-center shadow">
          <div className="mb-2 text-5xl">⛔</div>
          <h1 className="text-2xl font-bold text-du-red">Certificate not found</h1>
          <p className="mt-3 text-gray-600">This certificate was not issued by the Incubation Center.</p>
        </div>
      )}
      <p className="mt-6 text-center">
        <Link to="/" className="text-sm text-du-green-dark underline">Dilla University Incubation Center</Link>
      </p>
    </div>
  )
}