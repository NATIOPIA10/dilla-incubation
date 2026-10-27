import { Link, useOutletContext } from 'react-router-dom'
import { Clock, ExternalLink, Mail, MapPin, Phone, Send } from 'lucide-react'
import usePageTitle from '../../lib/usePageTitle'

export default function Contact() {
  usePageTitle('Contact')
  const { content } = useOutletContext()
  const c = content.contact
  const tg = (c.telegram || '').replace(/^@/, '')
  const mapOk = /^https?:\/\/[^\s]{3,300}$/.test(c.map_url || '')

  const items = [
    c.office && { Icon: MapPin, label: 'Office', value: c.office },
    c.hours && { Icon: Clock, label: 'Open', value: c.hours },
    c.phone && { Icon: Phone, label: 'Phone', value: c.phone, href: `tel:${c.phone.replace(/[^+\d]/g, '')}` },
    c.email && { Icon: Mail, label: 'Email', value: c.email, href: `mailto:${c.email}` },
    tg && { Icon: Send, label: 'Telegram', value: `@${tg}`, href: `https://t.me/${tg}` },
  ].filter(Boolean)

  return (
    <div>
      <section className="bg-du-green-dark text-white">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h1 className="text-3xl font-bold md:text-4xl">Contact us</h1>
          <p className="mt-2 text-white/80">We are happy to answer your questions about the center.</p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-12">
        {items.length === 0 ? (
          <p className="rounded-lg bg-white p-6 text-gray-700 shadow">
            Contact details will be published soon. In the meantime, please visit the Incubation Center office.
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {items.map(({ Icon, label, value, href }) => (
              <div key={label} className="flex gap-4 rounded-xl border-t-4 border-du-green bg-white p-5 shadow">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-du-green/10 text-du-green-dark">
                  <Icon size={22} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm text-gray-500">{label}</div>
                  {href ? (
                    <a
                      href={href}
                      target={href.startsWith('http') ? '_blank' : undefined}
                      rel="noreferrer noopener"
                      className="break-words font-semibold text-du-blue hover:underline"
                    >
                      {value}
                    </a>
                  ) : (
                    <div className="break-words font-semibold text-gray-800">{value}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {mapOk && (
          <a
            href={c.map_url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 rounded-lg border border-du-green-dark px-5 py-2 font-semibold text-du-green-dark hover:bg-green-50"
          >
            Open the location in maps <ExternalLink size={16} aria-hidden="true" />
          </a>
        )}

        <section className="rounded-xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold text-du-green-dark">Already a member?</h2>
          <p className="mt-1 text-gray-700">
            Members can message the center through the Telegram bot, or from the Support options after logging in.
          </p>
          <div className="mt-4 flex gap-3">
            <Link to="/login" className="rounded bg-du-green-dark px-5 py-2 text-sm font-semibold text-white hover:bg-du-green">
              Login
            </Link>
            <Link to="/register" className="rounded border border-du-green-dark px-5 py-2 text-sm font-semibold text-du-green-dark hover:bg-green-50">
              Register
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}