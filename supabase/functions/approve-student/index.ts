import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

// Random password without confusing characters (no 0/O, 1/l/I)
function makePassword(length = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

// The website address shown in the message (the SITE_URL secret wins if it is set)
function loginAddress(fromRequest: unknown): string {
  const fromSecret = Deno.env.get('SITE_URL')?.trim()
  const candidate = (fromSecret || (typeof fromRequest === 'string' ? fromRequest : ''))
    .trim()
    .replace(/\/+$/, '')
  return /^https?:\/\/[^\s]{3,200}$/.test(candidate) ? candidate : ''
}

// Sends the login to the student's Telegram, if they linked it
async function sendLogin(admin: any, studentId: string, text: string): Promise<'sent' | 'not_linked' | 'failed'> {
  try {
    const token = Deno.env.get('TELEGRAM_BOT_TOKEN')?.trim()
    if (!token) return 'failed'
    const { data: link } = await admin
      .from('telegram_links')
      .select('chat_id')
      .eq('student_id', studentId)
      .maybeSingle()
    if (!link || link.chat_id === null) return 'not_linked'

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: link.chat_id, text, disable_web_page_preview: true }),
    })
    const result = await res.json()
    if (!result.ok) {
      console.error('Telegram message failed:', JSON.stringify(result))
      return 'failed'
    }
    return 'sent'
  } catch (e) {
    console.error(e)
    return 'failed'
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // 1. Who is calling? Must be a logged-in admin.
    const authHeader = req.headers.get('Authorization') ?? ''
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: isAdmin, error: adminErr } = await userClient.rpc('is_admin')
    if (adminErr || isAdmin !== true) return json({ error: 'Admins only' }, 403)

    // The login was checked above, so the admin id can be read from the same token
    const jwt = authHeader.replace(/^Bearer\s+/i, '')
    let adminId: string | null = null
    try {
      const payload = JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
      adminId = typeof payload.sub === 'string' ? payload.sub : null
    } catch { /* handled below */ }
    if (!adminId) return json({ error: 'Not signed in' }, 401)

    // 2. Which student?
    const body = await req.json()
    const studentId = body?.studentId
    if (!studentId) return json({ error: 'studentId is required' }, 400)

    const admin = createClient(url, service)
    const { data: student, error: sErr } = await admin
      .from('students')
      .select('id, status, full_name, correction_reason')
      .eq('id', studentId)
      .single()
    if (sErr || !student) return json({ error: 'Student not found' }, 404)
    if (!['pending', 'waitlisted'].includes(student.status)) {
      return json({ error: `This student is already ${student.status}` }, 400)
    }
    if (student.correction_reason) {
      return json({ error: 'This registration was returned and is waiting for the applicant to correct it' }, 400)
    }

    // 3. The incubation ID (DUIC-####/yy) is the username
    const { data: username, error: idErr } = await admin.rpc('assign_incubation_id', {
      p_student: studentId,
    })
    if (idErr || !username) {
      return json({ error: idErr?.message ?? 'Could not assign the ID number' }, 400)
    }

    // 4. Create the login. The hidden email has no "/" in it.
    const email = `${String(username).toLowerCase().replace(/\//g, '-')}@inc.local`
    const tempPassword = makePassword()
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    })
    if (cErr || !created.user) {
      return json({ error: cErr?.message ?? 'Could not create the login' }, 400)
    }

    // 5. Link it to the student and mark approved
    const { error: uErr } = await admin
      .from('students')
      .update({
        auth_user_id: created.user.id,
        username,
        status: 'approved',
        must_change_password: true,
        rejection_reason: null,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', studentId)
      .in('status', ['pending', 'waitlisted'])

    if (uErr) {
      await admin.auth.admin.deleteUser(created.user.id) // undo
      return json({ error: uErr.message }, 400)
    }

    // 6. Send the login on Telegram (a failure here never blocks the approval)
    const site = loginAddress(body?.siteUrl)
    const lines = [
      'Dilla University Incubation Center',
      '',
      `Hello ${student.full_name}, your registration is approved ✔`,
      '',
      `Username: ${username}`,
      `Temporary password: ${tempPassword}`,
      '',
    ]
      if (site) lines.push(`Login: ${site}/login`)
    lines.push('You must choose a new password the first time you log in. Please do not share this message with anyone.')
    const telegram = await sendLogin(admin, studentId, lines.join('\n'))

    // The password is returned once and never stored anywhere
    return json({ username, tempPassword, telegram })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})