import { Link, useOutletContext } from 'react-router-dom'
import { Check } from 'lucide-react'
import usePageTitle from '../../lib/usePageTitle'

const STEPS = [
  'Register while a registration period is open, with your university ID photo, a valid mobile number, and at least 2 project titles.',
  'The center reviews your registration. It may approve it, put it on a waiting list, or return it to you for a correction.',
  'When approved, you receive your username (your incubation ID) and a temporary password. You choose your own password at your first login.',
  'You complete your profile. After the admin approves it, your ID card with a QR code is released.',
  'You get a seat, report your project progress, and add your projects and any copyright or patent rights.',
  'Verified projects are shown in the showcase. When you graduate, you receive a certificate.',
]

export default function About() {
  usePageTitle('About')
  const { content } = useOutletContext()

  return (
    <div>
      <section className="bg-du-green-dark text-white">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h1 className="text-3xl font-bold md:text-4xl">About the center</h1>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-12 px-4 py-12">
        <section>
          <p className="max-w-3xl whitespace-pre-line text-lg leading-relaxed text-gray-800">{content.about.text}</p>
        </section>

        <section className="rounded-xl border-l-4 border-du-green bg-white p-6 shadow">
          <h2 className="text-xl font-bold text-du-green-dark">Who can join</h2>
          <p className="mt-2 text-gray-700">
            Dilla University students from the <b>2nd to the 5th year</b>, while a registration period is open.
            You need a clear photo of your university ID, a valid mobile number, and at least 2 project titles.
          </p>
          <Link
            to="/register"
            className="mt-4 inline-block rounded bg-du-green-dark px-5 py-2 text-sm font-semibold text-white hover:bg-du-green"
          >
            Go to registration
          </Link>
        </section>

        {content.offer.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-du-green-dark">What we offer</h2>
            <ul className="mt-4 grid gap-4 md:grid-cols-2">
              {content.offer.map((o, i) => (
                <li key={`${o.title}-${i}`} className="flex gap-3 rounded-lg bg-white p-4 shadow">
                  <Check size={20} className="mt-0.5 shrink-0 text-du-green" aria-hidden="true" />
                  <div>
                    <div className="font-bold text-du-green-dark">{o.title}</div>
                    <div className="text-sm text-gray-700">{o.text}</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="text-2xl font-bold text-du-green-dark">From registration to certificate</h2>
          <ol className="mt-4 space-y-3">
            {STEPS.map((s, i) => (
              <li key={i} className="flex gap-4 rounded-lg bg-white p-4 shadow">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-du-green font-bold text-white">
                  {i + 1}
                </span>
                <span className="text-gray-800">{s}</span>
              </li>
            ))}
          </ol>
        </section>

        {content.faq.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-du-green-dark">Frequently asked questions</h2>
            <div className="mt-4 space-y-3">
              {content.faq.map((f, i) => (
                <details key={`${f.q}-${i}`} className="group rounded-lg bg-white p-4 shadow">
                  <summary className="cursor-pointer list-none font-bold text-du-green-dark">
                    <span className="flex items-center justify-between gap-3">
                      {f.q}
                      <span className="text-xl leading-none text-du-green transition-transform group-open:rotate-45">+</span>
                    </span>
                  </summary>
                  <p className="mt-3 whitespace-pre-line text-gray-700">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}