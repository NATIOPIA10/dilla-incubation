import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

function makePassword(length = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join('')
}

async function sendCredentials(chatId: number | string, username: string, password: string) {
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN')?.trim()
  if (!token) return { sent: false, message: 'Telegram bot token is not configured.' }
  const loginUrl = Deno.env.get('STUDENT_LOGIN_URL')?.trim()

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text:
          'Dilla University Incubation Center\n' +
          `Username: ${username}\n` +
          `Temporary password: ${password}\n` +
          `${loginUrl ? `Login: ${loginUrl}` : 'Log in through the Incubation Center student portal.'}\n\n` +
          'Please change this temporary password after your first login. Never share it.',
        disable_web_page_preview: true,
      }),
    })
    const result = await response.json()
    if (!response.ok || result.ok !== true) {
      return {
        sent: false,
        message: typeof result.description === 'string'
          ? result.description
          : `Telegram delivery failed (HTTP ${response.status}).`,
      }
    }
    return { sent: true, message: '' }
  } catch (error) {
    return {
      sent: false,
      message: error instanceof Error ? error.message : 'Telegram delivery failed.',
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('Authorization') ?? ''
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: isAdmin, error: adminErr } = await userClient.rpc('is_admin')
    if (adminErr || isAdmin !== true) return json({ error: 'Admins only' }, 403)
    const { data: userData, error: userErr } = await userClient.auth.getUser()
    const adminId = userData.user?.id
    if (userErr || !adminId) return json({ error: 'Not signed in' }, 401)

    const { studentId } = await req.json()
    if (!studentId) return json({ error: 'studentId is required' }, 400)

    const admin = createClient(url, service)
    const { data: student, error: studentErr } = await admin
      .from('students')
      .select('id, full_name, status')
      .eq('id', studentId)
      .maybeSingle()
    if (studentErr) return json({ error: studentErr.message }, 500)
    if (!student) return json({ error: 'Student not found' }, 404)
    if (!['pending', 'waitlisted'].includes(student.status)) {
      return json({ error: `This student is already ${student.status}` }, 400)
    }

    const { data: telegramLink, error: linkErr } = await admin
      .from('telegram_links')
      .select('chat_id')
      .eq('student_id', studentId)
      .not('chat_id', 'is', null)
      .maybeSingle()
    if (linkErr) return json({ error: `Could not check Telegram link: ${linkErr.message}` }, 500)

    const { data: username, error: idErr } = await admin.rpc('assign_incubation_id', {
      p_student: studentId,
    })
    if (idErr || !username) {
      return json({ error: idErr?.message ?? 'Could not assign the ID number' }, 400)
    }

    const email = `${String(username).toLowerCase().replace(/\//g, '-')}@inc.local`
    const tempPassword = makePassword()
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    })
    if (createErr || !created.user) {
      return json({ error: createErr?.message ?? 'Could not create the login' }, 400)
    }

    const { data: updated, error: updateErr } = await admin
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
      .select('id')
      .maybeSingle()

    if (updateErr || !updated) {
      await admin.auth.admin.deleteUser(created.user.id)
      return json({
        error: updateErr?.message ?? 'Student status changed before approval could finish.',
      }, 400)
    }

    const delivery = telegramLink?.chat_id
      ? await sendCredentials(telegramLink.chat_id, username, tempPassword)
      : { sent: false, message: 'No Telegram chat is linked to this registration.' }

    return json({
      username,
      tempPassword,
      telegramSent: delivery.sent,
      telegramMessage: delivery.message,
    })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500)
  }
})
