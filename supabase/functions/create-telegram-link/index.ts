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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const { universityId, photoPath } = await req.json()
    if (
      typeof universityId !== 'string' ||
      typeof photoPath !== 'string' ||
      !/^[A-Z]+-\d+\/\d{2}$/.test(universityId) ||
      !/^[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(photoPath)
    ) {
      return json({ error: 'Registration details are invalid.' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceRoleKey)
    const { data: student, error: studentError } = await admin
      .from('students')
      .select('id')
      .eq('university_id', universityId)
      .eq('university_id_photo_path', photoPath)
      .in('status', ['pending', 'waitlisted'])
      .maybeSingle()

    if (studentError) return json({ error: studentError.message }, 500)
    if (!student) return json({ error: 'Registration could not be verified.' }, 404)

    const { data: existingLink, error: lookupError } = await admin
      .from('telegram_links')
      .select('student_id, chat_id')
      .eq('student_id', student.id)
      .maybeSingle()
    if (lookupError) return json({ error: lookupError.message }, 500)
    if (existingLink?.chat_id !== null && existingLink?.chat_id !== undefined) {
      return json({ error: 'A Telegram account is already linked to this registration.' }, 409)
    }

    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const linkResult = existingLink
      ? await admin
          .from('telegram_links')
          .update({ token, expires_at: expiresAt, linked_at: null })
          .eq('student_id', student.id)
          .is('chat_id', null)
          .select('student_id')
          .maybeSingle()
      : await admin.from('telegram_links').insert({
          student_id: student.id,
          token,
          expires_at: expiresAt,
        })

    if (linkResult.error) return json({ error: linkResult.error.message }, 500)
    if (existingLink && !linkResult.data) {
      return json({ error: 'Telegram link was claimed by another request. Please try again.' }, 409)
    }

    return json({ url: `https://t.me/dillaincubationbot?start=${token}` })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500)
  }
})
