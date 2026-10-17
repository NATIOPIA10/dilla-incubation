import { createClient } from 'npm:@supabase/supabase-js@2'

const ok = () => new Response('ok', { status: 200 })

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Not found', { status: 404 })

  const secret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET')
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')?.trim()
  if (!secret || !botToken) return new Response('Not configured', { status: 500 })

  if (req.headers.get('x-telegram-bot-api-secret-token') !== secret) {
    return new Response('Unauthorized', { status: 401 })
  }

  let update
  try {
    update = await req.json()
  } catch {
    return ok()
  }

  const msg = update?.message
  if (!msg || msg.chat?.type !== 'private' || typeof msg.text !== 'string') return ok()

  const chatId: number = msg.chat.id
  const text: string = msg.text.trim()

  async function reply(message: string) {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        disable_web_page_preview: true,
      }),
    })
    const result = await response.json()
    if (!response.ok || result.ok !== true) {
      throw new Error(result.description ?? `Telegram reply failed (HTTP ${response.status}).`)
    }
  }

  try {
    if (!text.startsWith('/start')) {
      await reply(
        'This bot delivers your Dilla University Incubation Center login. ' +
        'Please use the "Get your login on Telegram" button on your registration confirmation page.'
      )
      return ok()
    }

    const token = text.split(/\s+/)[1]
    if (!token) {
      await reply(
        'Welcome to the Dilla University Incubation Center bot.\n\n' +
        'To receive your login here, register on the website and tap "Get your login on Telegram" on the confirmation page.'
      )
      return ok()
    }
    if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) {
      await reply('This link is not valid.')
      return ok()
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const { data: link, error: linkError } = await admin
      .from('telegram_links')
      .select('student_id, chat_id, expires_at, students(full_name, status)')
      .eq('token', token)
      .maybeSingle()

    if (linkError) {
      console.error('Could not look up Telegram link:', linkError.message)
      await reply('Something went wrong. Please try again later.')
      return ok()
    }

    const st = link ? (Array.isArray(link.students) ? link.students[0] : link.students) : null
    if (!link || !st) {
      await reply('This link is not valid.')
    } else if (new Date(link.expires_at) < new Date()) {
      await reply('This link has expired. Please register again or contact the Incubation Center.')
    } else if (link.chat_id !== null) {
      await reply(
        Number(link.chat_id) === chatId
          ? 'This Telegram account is already linked ✔ Your login will arrive here after approval.'
          : 'This link was already used.'
      )
    } else if (!['pending', 'waitlisted'].includes(st.status)) {
      await reply('This registration is no longer waiting for approval. Please contact the Incubation Center.')
    } else {
      const { data: updated, error } = await admin
        .from('telegram_links')
        .update({ chat_id: chatId, linked_at: new Date().toISOString() })
        .eq('student_id', link.student_id)
        .is('chat_id', null)
        .select('student_id')
        .maybeSingle()

      if (error || !updated) {
        await reply(
          error?.code === '23505'
            ? 'This Telegram account is already linked to another registration.'
            : 'Something went wrong. Please try again later.'
        )
      } else {
        await reply(
          `Linked ✔\n\nHello ${st.full_name}. After the Incubation Center approves your registration, ` +
          'your login will be sent to this chat.\n\nPlease keep this chat, and never share your login with anyone.'
        )
      }
    }
  } catch (error) {
    console.error('Telegram webhook failed:', error)
  }

  return ok()
})
