import { QRCodeSVG } from 'qrcode.react'

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null

export default function Certificate({ cert }) {
  const s = cert.snapshot
  const projects = s.projects ?? []
  const rights = s.rights ?? []
  const verifyUrl = `${window.location.origin}/verify-certificate/${cert.verify_token}`

  const joined = fmt(s.joined_at)
  const left = fmt(s.left_at)

  return (
    <div
      id="certificate-print"
      className="bg-white"
      style={{ width: 1123, minHeight: 794, padding: 24, boxSizing: 'border-box', fontFamily: 'Georgia, "Times New Roman", serif' }}
    >
      <div
        className="flex flex-col"
        style={{ border: '8px double #2F6B2F', minHeight: 746, padding: '24px 48px', boxSizing: 'border-box' }}
      >
        {/* Header */}
        <div className="flex items-center justify-center gap-4">
          <img
            src="/logo.png"
            alt=""
            style={{ height: 72, width: 72, objectFit: 'contain' }}
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
          <div className="text-center leading-tight">
            <div className="text-3xl font-bold tracking-wide text-du-green-dark">DILLA UNIVERSITY</div>
            <div className="text-lg text-du-maroon">Incubation Center</div>
            <div className="text-xs italic text-gray-500">University of the Green Land</div>
          </div>
        </div>

        <div className="mx-auto my-4 h-1 w-40 bg-du-green" />

        <h1 className="text-center text-4xl font-bold uppercase tracking-widest text-du-green-dark">
          Certificate of Incubation
        </h1>

        <p className="mt-4 text-center text-gray-600">This is to certify that</p>
        <p className="mt-1 text-center text-4xl font-bold text-du-maroon">{s.full_name}</p>

        <p className="mx-auto mt-3 max-w-3xl text-center text-gray-700">
          {s.department ? `of the Department of ${s.department}, ` : ''}
          {s.incubation_id ? `Incubation ID ${s.incubation_id}, ` : ''}
          was a member of the Dilla University Incubation Center
          {joined ? ` from ${joined}` : ''}
          {left ? ` until ${left}` : ''}
          , and achieved the following during incubation.
        </p>

        {/* Achievements */}
        <div className="mt-5 grid grid-cols-2 gap-8 text-sm">
          <div>
            <h2 className="mb-2 border-b-2 border-du-green pb-1 font-bold uppercase tracking-wide text-du-green-dark">
              Deployed projects
            </h2>
            {projects.length === 0 ? (
              <p className="italic text-gray-500">No verified deployed projects.</p>
            ) : (
              <ul className="space-y-2">
                {projects.map((p, i) => (
                  <li key={i}>
                    <div className="font-bold">{p.title}</div>
                    {p.description && <div className="text-gray-600">{p.description}</div>}
                    {p.live_url && <div className="break-all text-xs text-du-blue">{p.live_url}</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h2 className="mb-2 border-b-2 border-du-green pb-1 font-bold uppercase tracking-wide text-du-green-dark">
              Copyright and patent rights
            </h2>
            {rights.length === 0 ? (
              <p className="italic text-gray-500">No verified copyright or patent rights.</p>
            ) : (
              <ul className="space-y-2">
                {rights.map((r, i) => (
                  <li key={i}>
                    <div className="font-bold">
                      {r.type === 'patent' ? 'Patent' : 'Copyright'}: {r.title}
                    </div>
                    <div className="text-xs text-gray-600">
                      {r.registration_number && `No. ${r.registration_number}`}
                      {r.registration_number && r.issuing_authority && ' · '}
                      {r.issuing_authority}
                      {fmt(r.granted_date) && ` · ${fmt(r.granted_date)}`}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto flex items-end justify-between pt-8">
          <div className="text-xs text-gray-600">
            <div>Certificate No: <b className="font-mono">{cert.certificate_number}</b></div>
            <div>Issued on {fmt(cert.issued_at)}</div>
          </div>

          <div className="text-center">
            <div className="w-56 border-t border-gray-500 pt-1 text-sm text-gray-700">
              Director, Incubation Center
            </div>
          </div>

          <div className="flex flex-col items-center">
            <QRCodeSVG value={verifyUrl} size={84} level="M" />
            <span className="mt-1 text-[10px] text-gray-500">Scan to verify</span>
          </div>
        </div>
      </div>
    </div>
  )
}