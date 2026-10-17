import { supabase } from './supabase'
import { yearOfStudyLabel } from './years'

const date = (value) => (value ? new Date(value).toLocaleDateString('en-GB') : '')

const fullId = (student) =>
  student.id_number
    ? `DUIC-${student.id_number}/${String(student.id_year % 100).padStart(2, '0')}`
    : ''

function list(items, format) {
  return (items ?? []).map(format).join('\n')
}

function addDataSheet(workbook, { sheetName, headers, widths, rows }) {
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 4 }],
  })
  sheet.mergeCells(1, 1, 1, headers.length)
  sheet.getCell(1, 1).value = `Dilla University Incubation Center: ${sheetName}`
  sheet.getCell(1, 1).font = { bold: true, size: 16, color: { argb: 'FF2F6B2F' } }
  sheet.mergeCells(2, 1, 2, headers.length)
  sheet.getCell(2, 1).value =
    `Exported on ${new Date().toLocaleDateString('en-GB')} · ${rows.length} records`
  sheet.getCell(2, 1).font = { italic: true, color: { argb: 'FF555555' } }

  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width
  })
  headers.forEach((header, index) => {
    const cell = sheet.getRow(4).getCell(index + 1)
    cell.value = header
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F6B2F' } }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    }
  })
  sheet.getRow(4).height = 24

  rows.forEach((values, index) => {
    const row = sheet.addRow(values)
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.alignment = { vertical: 'top', wrapText: true }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      }
      if (index % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F4EE' } }
      }
    })
  })

  sheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: 4, column: headers.length },
  }
}

async function downloadWorkbook(workbook, filename) {
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${filename}-${new Date().toISOString().slice(0, 10)}.xlsx`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

async function downloadSheet({ filename, sheetName, headers, widths, rows, title }) {
  if (rows.length === 0) return 0

  const mod = await import('exceljs')
  const ExcelJS = mod.default ?? mod
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Dilla University Incubation Center'
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 4 }],
  })

  sheet.mergeCells(1, 1, 1, headers.length)
  sheet.getCell(1, 1).value = `Dilla University Incubation Center: ${title}`
  sheet.getCell(1, 1).font = { bold: true, size: 16, color: { argb: 'FF2F6B2F' } }
  sheet.mergeCells(2, 1, 2, headers.length)
  sheet.getCell(2, 1).value =
    `Exported on ${new Date().toLocaleDateString('en-GB')} · ${rows.length} records`
  sheet.getCell(2, 1).font = { italic: true, color: { argb: 'FF555555' } }

  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width
  })
  headers.forEach((header, index) => {
    const cell = sheet.getRow(4).getCell(index + 1)
    cell.value = header
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F6B2F' } }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    }
  })
  sheet.getRow(4).height = 24

  rows.forEach((values, index) => {
    const row = sheet.addRow(values)
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.alignment = { vertical: 'top', wrapText: true }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      }
      if (index % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F4EE' } }
      }
    })
  })

  sheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: 4, column: headers.length },
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${filename}-${new Date().toISOString().slice(0, 10)}.xlsx`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)

  return rows.length
}

export async function exportApprovedProfiles() {
  const { data, error } = await supabase
    .from('students')
    .select(
      'full_name, gender, department, year_of_study, university_id, phone, username, emergency_contact_name, emergency_contact_phone, id_number, id_year, id_issued_at, created_at, profile_status, status'
    )
    .eq('profile_status', 'approved')
    .order('full_name')

  if (error) throw new Error(error.message)

  const rows = data.map((student) => [
    student.full_name,
    student.gender ?? '',
    student.department ?? '',
    yearOfStudyLabel(student.year_of_study),
    student.university_id,
    student.phone ?? '',
    student.username ?? '',
    fullId(student),
    student.emergency_contact_name ?? '',
    student.emergency_contact_phone ?? '',
    date(student.created_at),
    date(student.id_issued_at),
    student.status,
  ])

  return downloadSheet({
    filename: 'approved-profiles',
    sheetName: 'Approved profiles',
    title: 'Approved student profiles',
    headers: [
      'Full name', 'Gender', 'Department', 'Year of study', 'University ID',
      'Phone', 'Username', 'Incubation ID', 'Emergency contact', 'Emergency phone',
      'Registered on', 'ID issued on', 'Account status',
    ],
    widths: [28, 12, 24, 16, 22, 18, 20, 18, 26, 20, 16, 16, 18],
    rows,
  })
}

export async function exportCertificates() {
  const { data, error } = await supabase
    .from('students')
    .select(
      'full_name, gender, department, university_id, phone, username, id_number, id_year, deactivated_at, certificates(id, certificate_number, issued_at, snapshot)'
    )
    .eq('status', 'deactivated')
    .order('full_name')

  if (error) throw new Error(error.message)

  const rows = data.flatMap((student) => {
    const certificates = Array.isArray(student.certificates)
      ? student.certificates
      : student.certificates
        ? [student.certificates]
        : []

    return certificates.map((certificate) => {
      const snapshot = certificate.snapshot ?? {}
      return [
        certificate.certificate_number,
        date(certificate.issued_at),
        student.full_name,
        student.gender ?? '',
        student.department ?? '',
        student.university_id,
        student.phone ?? '',
        student.username ?? '',
        fullId(student),
        date(snapshot.joined_at),
        date(snapshot.left_at ?? student.deactivated_at),
        list(snapshot.projects, (project) =>
          [project.title, project.description, project.live_url].filter(Boolean).join(' — ')
        ),
        list(snapshot.rights, (right) =>
          [
            `${right.type === 'patent' ? 'Patent' : 'Copyright'}: ${right.title}`,
            right.registration_number,
            right.issuing_authority,
            date(right.granted_date),
          ].filter(Boolean).join(' — ')
        ),
      ]
    })
  })

  return downloadSheet({
    filename: 'issued-certificates',
    sheetName: 'Certificates',
    title: 'Issued certificates and student information',
    headers: [
      'Certificate number', 'Issued on', 'Student name', 'Gender', 'Department',
      'University ID', 'Phone', 'Username', 'Incubation ID', 'Joined center',
      'Left center', 'Verified deployed projects', 'Verified rights',
    ],
    widths: [24, 16, 28, 12, 24, 22, 18, 20, 18, 16, 16, 60, 60],
    rows,
  })
}

export async function exportStudentPortfolioAssets() {
  const studentFields =
    'full_name, gender, department, year_of_study, university_id, phone, username, ' +
    'id_number, id_year, emergency_contact_name, emergency_contact_phone, status'
  const [projectsResult, rightsResult] = await Promise.all([
    supabase
      .from('projects')
      .select(`title, description, tech_stack, repo_url, live_url, is_deployed, verification_status, rejection_reason, verified_at, created_at, students(${studentFields})`)
      .order('created_at', { ascending: false }),
    supabase
      .from('ip_records')
      .select(`ip_type, title, registration_number, issuing_authority, granted_date, verification_status, rejection_reason, verified_at, created_at, projects(title), students(${studentFields})`)
      .order('created_at', { ascending: false }),
  ])

  const error = projectsResult.error || rightsResult.error
  if (error) throw new Error(error.message)

  const projects = projectsResult.data
  const rights = rightsResult.data
  if (projects.length === 0 && rights.length === 0) return 0

  const studentDetails = (student) => [
    student?.full_name ?? '',
    student?.gender ?? '',
    student?.department ?? '',
    yearOfStudyLabel(student?.year_of_study),
    student?.university_id ?? '',
    student?.phone ?? '',
    student?.username ?? '',
    student ? fullId(student) : '',
    student?.emergency_contact_name ?? '',
    student?.emergency_contact_phone ?? '',
    student?.status ?? '',
  ]

  const projectRows = projects.map((project) => [
    ...studentDetails(project.students),
    project.title,
    project.description ?? '',
    project.tech_stack ?? '',
    project.is_deployed ? 'Yes' : 'No',
    project.live_url ?? '',
    project.repo_url ?? '',
    project.verification_status,
    project.rejection_reason ?? '',
    date(project.created_at),
    date(project.verified_at),
  ])

  const rightRows = (type) =>
    rights
      .filter((record) => record.ip_type === type)
      .map((record) => [
        ...studentDetails(record.students),
        record.title,
        record.registration_number ?? '',
        record.issuing_authority ?? '',
        date(record.granted_date),
        record.projects?.title ?? '',
        record.verification_status,
        record.rejection_reason ?? '',
        date(record.created_at),
        date(record.verified_at),
      ])

  const studentHeaders = [
    'Student name', 'Gender', 'Department', 'Year of study', 'University ID',
    'Phone', 'Username', 'Incubation ID', 'Emergency contact', 'Emergency phone',
    'Account status',
  ]
  const studentWidths = [28, 12, 24, 16, 22, 18, 20, 18, 26, 20, 18]

  const workbookModule = await import('exceljs')
  const ExcelJS = workbookModule.default ?? workbookModule
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Dilla University Incubation Center'

  addDataSheet(workbook, {
    sheetName: 'Projects',
    headers: [
      ...studentHeaders,
      'Project title', 'Description', 'Technologies', 'Deployed', 'Live URL',
      'Code URL', 'Verification status', 'Rejection reason', 'Added on', 'Verified on',
    ],
    widths: [...studentWidths, 32, 48, 28, 12, 36, 36, 20, 36, 16, 16],
    rows: projectRows,
  })

  const rightsHeaders = [
    ...studentHeaders,
    'Title', 'Registration number', 'Issuing authority', 'Date granted',
    'Related project', 'Verification status', 'Rejection reason', 'Added on', 'Verified on',
  ]
  const rightsWidths = [...studentWidths, 32, 22, 32, 16, 32, 20, 36, 16, 16]

  addDataSheet(workbook, {
    sheetName: 'Copyrights',
    headers: rightsHeaders,
    widths: rightsWidths,
    rows: rightRows('copyright'),
  })
  addDataSheet(workbook, {
    sheetName: 'Patents',
    headers: rightsHeaders,
    widths: rightsWidths,
    rows: rightRows('patent'),
  })

  await downloadWorkbook(workbook, 'student-projects-copyrights-patents')
  return projects.length + rights.length
}
