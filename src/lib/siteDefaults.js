import { CONTACT } from './config'

// The website text used until staff edit it in the admin page (step 2).
// Please review it with the center's leadership before the site is shared.
export const DEFAULTS = {
  home: {
    headline: 'Dilla University Incubation Center',
    intro:
      'A place where Dilla University students turn project ideas into working products. Register, get a seat, follow your project from proposal to deployment, and earn recognition for what you build.',
  },
  about: {
    text:
      'The Dilla University Incubation Center supports students who want to build real projects. Students from the 2nd to the 5th year can apply when registration is open. Accepted students receive a seat in the incubation rooms, an official incubation ID card, regular project follow-up, and a certificate that lists their verified, deployed projects and any copyright or patent rights they obtain.',
  },
  offer: [
    { title: 'A seat to work', text: 'Accepted students are given a seat in an incubation room.' },
    {
      title: 'Project follow-up',
      text: 'Students report their progress from proposal, frontend, backend, and testing to a finished project.',
    },
    {
      title: 'Official ID card',
      text: 'Every member receives an incubation ID card with a QR code that anyone can verify.',
    },
    {
      title: 'Recognition',
      text: 'Verified projects are showcased, and graduates receive a certificate listing their deployed projects and any copyright or patent rights.',
    },
    {
      title: 'Announcements',
      text: 'Events and notices reach members on their dashboard and on Telegram.',
    },
  ],
  faq: [
    {
      q: 'Who can register?',
      a: 'Dilla University students from the 2nd to the 5th year, while a registration period is open.',
    },
    {
      q: 'What do I need to register?',
      a: 'A clear photo of your university ID, a valid mobile phone number, and at least 2 project titles you want to work on.',
    },
    {
      q: 'How will I get my login?',
      a: 'After the center approves your registration, your username and a temporary password are sent to your Telegram if you linked it, or given to you by the admin. You must choose a new password the first time you log in.',
    },
    {
      q: 'I made a mistake in my registration. What can I do?',
      a: 'If your registration is still waiting, the center can return it to you with a private link to correct it. After approval, you can change your project titles yourself and ask for a photo change in My account.',
    },
    {
      q: 'I forgot my password.',
      a: 'Message the center through the Telegram bot, or contact the office. The admin will confirm who you are before resetting it.',
    },
  ],
  contact: {
    office: CONTACT.office ?? '',
    hours: CONTACT.hours ?? '',
    phone: CONTACT.phone ?? '',
    email: CONTACT.email ?? '',
    telegram: CONTACT.telegram ?? '',
    map_url: '',
  },
}

// Staff edits (from the database) win over the defaults above
export function mergeContent(rows) {
  const out = {}
  for (const key of Object.keys(DEFAULTS)) {
    const d = DEFAULTS[key]
    out[key] = Array.isArray(d) ? [...d] : { ...d }
  }
  for (const r of rows ?? []) {
    if (!(r.key in DEFAULTS)) continue
    const d = DEFAULTS[r.key]
    if (Array.isArray(d)) {
      if (Array.isArray(r.value)) out[r.key] = r.value
    } else if (r.value && typeof r.value === 'object' && !Array.isArray(r.value)) {
      out[r.key] = { ...d, ...r.value }
    }
  }
  return out
}