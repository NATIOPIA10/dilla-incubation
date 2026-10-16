import { supabase } from './supabase'
import { stageLabel, stateLabel } from './stages'
import { yearOfStudyLabel } from './years'

const dateTime = (value) => (value ? new Date(value).toLocaleString('en-GB') : '')

function addSheet(workbook, name, headers, rows, widths) {
  const sheet = workbook.addWorksheet(name, {
    views: [{ state: 'frozen', ySplit: 1 }],
  })
  sheet.columns = headers.map((header, index) => ({
    header,
    width: widths[index],
  }))
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2F6B2F' },
  }
  sheet.getRow(1).alignment = { vertical: 'middle', wrapText: true }
  sheet.addRows(rows)
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length },
  }
  return sheet
}

export async function exportProjects() {
  const [studentsResult, requestsResult, recipientsResult, submissionsResult] = await Promise.all([
    supabase
      .from('students')
      .select(
        'id, full_name, university_id, department, year_of_study, phone, username, status, proposed_titles, project_titles(title, created_at)'
      )
      .order('full_name'),
    supabase.from('status_requests').select('id, title, created_at, deadline'),
    supabase.from('status_request_recipients').select('request_id, student_id'),
    supabase
      .from('status_submissions')
      .select('request_id, student_id, stage, state, note, link, updated_at'),
  ])

  const error =
    studentsResult.error ||
    requestsResult.error ||
    recipientsResult.error ||
    submissionsResult.error
  if (error) throw new Error(error.message)

  const students = studentsResult.data
  const studentById = new Map(students.map((student) => [student.id, student]))
  const requestById = new Map(requestsResult.data.map((request) => [request.id, request]))
  const submissionByKey = new Map(
    submissionsResult.data.map((submission) => [
      `${submission.request_id}:${submission.student_id}`,
      submission,
    ])
  )

  const projectRows = students.flatMap((student) => {
    const titles = [
      ...(student.proposed_titles ?? []).map((title) => ({ title, source: 'Registration' })),
      ...(student.project_titles ?? []).map((project) => ({
        title: project.title,
        source: `Added ${dateTime(project.created_at)}`,
      })),
    ]

    return titles.map((project) => [
      student.full_name,
      student.university_id,
      student.username,
      student.department,
      yearOfStudyLabel(student.year_of_study),
      student.phone,
      student.status,
      project.title,
      project.source,
    ])
  })

  const statusRows = recipientsResult.data.flatMap((recipient) => {
    const student = studentById.get(recipient.student_id)
    const request = requestById.get(recipient.request_id)
    if (!student || !request) return []

    const submission = submissionByKey.get(`${recipient.request_id}:${recipient.student_id}`)
    return [[
      request.title,
      dateTime(request.created_at),
      dateTime(request.deadline),
      student.full_name,
      student.university_id,
      student.username,
      student.department,
      student.phone,
      submission ? stageLabel(submission.stage) : '',
      submission ? stateLabel(submission.state) : '',
      submission?.note ?? (submission ? '' : 'Not submitted'),
      submission?.link ?? '',
      dateTime(submission?.updated_at),
    ]]
  })

  if (projectRows.length === 0 && statusRows.length === 0) return 0

  const mod = await import('exceljs')
  const ExcelJS = mod.default ?? mod
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Dilla University Incubation Center'

  addSheet(
    workbook,
    'Projects',
    [
      'Owner name', 'University ID', 'Username', 'Department', 'Year of study',
      'Phone', 'Account status', 'Project title', 'Title source',
    ],
    projectRows,
    [28, 22, 20, 24, 16, 18, 16, 48, 24]
  )
  addSheet(
    workbook,
    'Project status',
    [
      'Request', 'Requested on', 'Deadline', 'Owner name', 'University ID',
      'Username', 'Department', 'Phone', 'Stage', 'Stage status', 'Note',
      'Project link', 'Submitted / updated',
    ],
    statusRows,
    [32, 22, 22, 28, 22, 20, 24, 18, 28, 18, 42, 42, 22]
  )

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `student-projects-status-${new Date().toISOString().slice(0, 10)}.xlsx`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)

  return projectRows.length + statusRows.length
}
