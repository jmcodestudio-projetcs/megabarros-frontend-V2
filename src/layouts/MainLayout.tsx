import type { ReactNode } from "react"
import { Link, useNavigate } from "react-router-dom"
import { clearAuth } from "../services/tokenStorage"
import { useState } from "react"

type MainLayoutProps = {
  children: ReactNode
  title?: string
}

export default function MainLayout({ children, title }: MainLayoutProps) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  function handleLogout() {
    clearAuth()
    navigate("/login")
  }

  return (
    <div className="min-h-screen bg-brand-gray">
      <header className="bg-brand-dark text-white">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-4">
          <Link
            to="/dashboard"
            className="text-lg sm:text-xl font-semibold hover:opacity-90"
          >
            Mega Barros Assessoria
          </Link>

          <div className="hidden sm:flex items-center gap-2 sm:gap-3">
            <Link
              to="/dashboard"
              className="text-sm sm:text-base px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition"
            >
              Dashboard
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm sm:text-base px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 transition"
            >
              Sair
            </button>
          </div>

          <button
            onClick={() => setOpen((prev) => !prev)}
            className="sm:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 transition"
            aria-label="Menu"
          >
            <span className="text-xl">{open ? "✖" : "☰"}</span>
          </button>
        </div>

        {open && (
          <div className="sm:hidden border-t border-white/10 px-4 pb-4">
            <div className="flex flex-col gap-2 pt-3">
              <Link
                to="/dashboard"
                onClick={() => setOpen(false)}
                className="text-sm px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
              >
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 transition"
              >
                Sair
              </button>
            </div>
          </div>
        )}

        {title && (
          <div className="mx-auto max-w-6xl px-4 pb-4">
            <span className="text-sm sm:text-base text-white/80">{title}</span>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}