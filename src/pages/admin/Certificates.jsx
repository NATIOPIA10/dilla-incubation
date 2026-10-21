import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const fullId = (s) =>
  s.id_number ? `DUIC-${s.id_number}/${String(s.id_year % 100).padStart(2, '0')}` : '—'

export default function Certificates() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [exporting, setExporting] = useState(false)

  const load = useCallback(async () => {
    const { data, error: e } = await supabase
      .from('students')
      .select('id, full_name, department, id_number, id_year, deactivated_at, certificates(id, certificate_number, issued_at)')
      .eq('status', 'deactivated')
      .order('deactivated_at', { ascending: false })
    setLoading(false)
    if (e) return setError(e.message)
    setError('')
    setRows(data)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function issue(s) {
    setError('')
    setBusyId(s.id)
    const [p, r] = await Promise.all([
      supabase.from('projects').select('id', { count: 'exact', head: true })
        .eq('student_id', s.id).eq('verification_status', 'verified').eq('is_deployed', true),
      supabase.from('ip_records').select('id', { count: 'exact', head: true })
        .eq('student_id', s.id).eq('verification_status', 'verified'),
    ])
    const ok = window.confirm(
      `Issue a certificate for ${s.full_name}?\n\n` +
      `It will list ${p.count ?? 0} verified deployed project(s) and ${r.count ?? 0} verified copyright or patent record(s).\n\n` +
      `Items that are not verified will NOT appear. Verify them first in "Projects and rights". ` +
      `A certificate cannot be changed after it is issued.`
    )
    if (!ok) return setBusyId(null)

    const { data, error: e } = await supabase.rpc('issue_certificate', { p_student: s.id })
    setBusyId(null)
    if (e) return setError(e.message)
    navigate(`/admin/certificates/${data}`)
  }

  async function exportCertificates() {
    setError('')
    setExporting(true)
    try {
      const issued = rows.flatMap((student) => {
        const cert = Array.isArray(student.certificates) ? student.certificates[0] : student.certificates
        return cert ? [{ student, cert }] : []
      })
      if (issued.length === 0) {
        setError('There are no certificates to export.')
        return
      }

      const mod = await import('exceljs')
      const ExcelJS = mod.default ?? mod
      const workbook = new ExcelJS.Workbook()
      const sheet = workbook.addWorksheet('Certificates')
      sheet.columns = [
        { header: 'Certificate number', key: 'certificate', width: 24 },
        { header: 'Student', key: 'student', width: 30 },
        { header: 'Department', key: 'department', width: 28 },
        { header: 'Incubation ID', key: 'id', width: 20 },
        { header: 'Issued on', key: 'issued', width: 16 },
      ]
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
      sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F6B2F' } }
      issued.forEach(({ student, cert }) => {
        sheet.addRow({
          certificate: cert.certificate_number,
          student: student.full_name,
          department: student.department ?? '',
          id: fullId(student),
          issued: cert.issued_at ? new Date(cert.issued_at).toLocaleDateString('en-GB') : '',
        })
      })

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `certificates-${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
    } catch (e) {
      setError(`Export failed: ${e.message}`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      <p className="mb-4 text-sm text-gray-600">
        Certificates are issued to students who have been deactivated (graduated or left).
        Check their projects and rights in <b>Projects and rights</b> before issuing.
      </p>

      <div className="mb-4 flex justify-end">
        <button
          onClick={exportCertificates}
          disabled={exporting || loading}
          className="rounded border border-du-green-dark px-4 py-2 text-sm font-semibold text-du-green-dark hover:bg-green-50 disabled:opacity-60"
        >
          {exporting ? 'Preparing...' : 'Export certificates to Excel'}
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-du-red">{error}</p>}

      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="w-full text-left text-sm">
          <thead className="bg-du-green/10 text-du-green-dark">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Incubation ID</th>
              <th className="px-4 py-3">Left on</th>
              <th className="px-4 py-3">Certificate</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No deactivated students yet.</td></tr>
            )}
            {rows.map((s) => {
              const cert = Array.isArray(s.certificates) ? s.certificates[0] : s.certificates
              return (
                <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{s.full_name}</div>
                    <div className="text-xs text-gray-500">{s.department}</div>
                  </td>
                  <td className="px-4 py-3 font-mono">{fullId(s)}</td>
                  <td className="px-4 py-3">{s.deactivated_at && new Date(s.deactivated_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-mono text-xs">{cert?.certificate_number ?? 'Not issued'}</td>
                  <td className="px-4 py-3 text-right">
                    {cert ? (
                      <Link to={`/admin/certificates/${cert.id}`}
                        className="rounded bg-du-green-dark px-3 py-1 text-white hover:bg-du-green">
                        View / Print
                      </Link>
                    ) : (
                      <button disabled={busyId === s.id} onClick={() => issue(s)}
                        className="rounded bg-du-green-dark px-3 py-1 text-white hover:bg-du-green disabled:opacity-50">
                        {busyId === s.id ? 'Working...' : 'Issue certificate'}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}