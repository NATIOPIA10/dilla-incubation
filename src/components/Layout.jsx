import { Outlet } from 'react-router-dom'
import Header from './Header'

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="text-center text-xs text-gray-500 py-4">
        © 2026 – Dilla University. All Rights Reserved.
      </footer>
    </div>
  )
}