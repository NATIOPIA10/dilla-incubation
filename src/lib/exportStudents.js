import { supabase } from './supabase'
import { yearOfStudyLabel } from './years'

const fullId = (s) =>
  s.id_number ? `DUIC-${s.id_number}/${String(s.id_year % 100).padStart(2, '0')}` : ''

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-GB') : '')

const cap = (v) => (v ? v.charAt(0).toUpperCase() + v.slice(1) : '')

export async function exportStudents({ statuses, title, fileLabel }) {
  const { data, error } = await supabase
    .from('students')
    .select(
      '*, room_assignments(ended_at, rooms(building, room_number)), project_titles(title, created_at)'
    )
    .in('status', statuses)
    .order('full_name')

  if (error) throw new Error(error.message)
  if (!data.length) return 0

  const mod = await import('exceljs')
  const ExcelJS = mod.default ?? mod

  const headers = [
    'No.', 'Incubation ID', 'Full name', 'Gender', 'University ID', 'Department',
    'Year of study', 'Phone', 'Emergency contact', 'Emergency phone', 'Room',
    'Registered on', 'ID issued on', 'Account', 'Profile', 'Project titles',
  ]
  const widths = [6, 16, 28, 10, 18, 24, 14, 16, 24, 16, 20, 14, 14, 12, 12, 50]

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Dilla University Incubation Center'
  const ws = wb.addWorksheet(title.slice(0, 31), {
    views: [{ state: 'frozen', ySplit: 4 }],
  })
  widths.forEach((w, i) => (ws.getColumn(i + 1).width = w))

  // Title and subtitle
  ws.mergeCells(1, 1, 1, headers.length)
  const t = ws.getCell(1, 1)
  t.value = `Dilla University Incubation Center: ${title}`
  t.font = { bold: true, size: 16, color: { argb: 'FF2F6B2F' } }
  ws.mergeCells(2, 1, 2, headers.length)
  const sub = ws.getCell(2, 1)
  sub.value = `Exported on ${new Date().toLocaleDateString('en-GB')} · ${data.length} students`
  sub.font = { italic: true, color: { argb: 'FF555555' } }

  // Header row (row 4)
  const headerRow = ws.getRow(4)
  headers.forEach((h, i) => {
    const c = headerRow.getCell(i + 1)
    c.value = h
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F6B2F' } }
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
  })
  headerRow.height = 24

  // Data rows
  data.forEach((s, idx) => {
    const room = (s.room_assignments ?? []).find((a) => a.ended_at === null)
    const later = [...(s.project_titles ?? [])]
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map((x) => x.title)
        const titles = later.length ? later : (s.proposed_titles ?? [])

    const values = [
      idx + 1,
      fullId(s),
      s.full_name,
      cap(s.gender),
      s.university_id,
      s.department ?? '',
      yearOfStudyLabel(s.year_of_study),
      s.phone ?? '',
      s.emergency_contact_name ?? '',
      s.emergency_contact_phone ?? '',
      room ? `${room.rooms.building} · ${room.rooms.room_number}` : '',
      fmtDate(s.created_at),
      fmtDate(s.id_issued_at),
      cap(s.status),
      cap(s.profile_status),
      titles.map((x, i) => `${i + 1}. ${x}`).join('\n'),
    ]

    const row = ws.addRow(values)
    row.eachCell({ includeEmpty: true }, (c, col) => {
      c.alignment = { vertical: 'top', wrapText: col === headers.length || col === 3 }
      c.border = {
        top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      }
      if (idx % 2 === 1) {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F4EE' } }
      }
    })
  })

  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: headers.length } }

  // Download
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${fileLabel}-${new Date().toISOString().slice(0, 10)}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)

  return data.length
}