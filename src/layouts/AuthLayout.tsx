import type { ReactNode } from "react"
import logo from "../assets/logo.jpeg"

type AuthLayoutProps = {
  children: ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-brand-gray flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="mb-6 text-center">
          <img
            src={logo}
            alt="Mega Barros Assessoria"
            className="mx-auto h-16 object-contain"
          />
          <p className="mt-3 text-sm text-gray-500">
            Acesse sua conta para continuar
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}