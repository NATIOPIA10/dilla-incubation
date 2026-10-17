import { CONTACT } from '../lib/config'

export default function ContactBox({ className = '' }) {
  const tg = (CONTACT.telegram || '').replace(/^@/, '')

  const items = [
    CONTACT.office && { icon: '📍', label: 'Office', value: CONTACT.office },
    CONTACT.hours && { icon: '🕒', label: 'Open', value: CONTACT.hours },
    CONTACT.phone && {
      icon: '📞',
      label: 'Phone',
      value: CONTACT.phone,
      href: `tel:${CONTACT.phone.replace(/[^+\d]/g, '')}`,
    },
    tg && { icon: '✈️', label: 'Telegram', value: `@${tg}`, href: `https://t.me/${tg}` },
    CONTACT.email && { icon: '✉️', label: 'Email', value: CONTACT.email, href: `mailto:${CONTACT.email}` },
  ].filter(Boolean)

  return (
    <div className={`rounded-lg border-l-4 border-du-blue bg-white p-4 shadow ${className}`}>
      <h3 className="font-bold text-du-blue">Need help?</h3>
      <p className="mt-1 text-sm text-gray-600">
        For a forgotten password or any other problem, contact the Incubation Center. To reset a
        password, the admin will first ask you to confirm who you are, for example with your
        university ID or your registered phone number.
      </p>

      {items.length > 0 ? (
        <ul className="mt-3 space-y-1.5 text-sm">
          {items.map((it) => (
            <li key={it.label} className="flex gap-2">
              <span aria-hidden="true">{it.icon}</span>
              <span>
                <span className="text-gray-500">{it.label}: </span>
                {it.href ? (
                  <a
                    href={it.href}
                    target={it.href.startsWith('http') ? '_blank' : undefined}
                    rel="noreferrer noopener"
                    className="font-semibold text-du-blue underline"
                  >
                    {it.value}
                  </a>
                ) : (
                  <span className="font-semibold">{it.value}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm font-semibold text-gray-700">
          Please visit the Incubation Center office and ask the admin.
        </p>
      )}
    </div>
  )
}