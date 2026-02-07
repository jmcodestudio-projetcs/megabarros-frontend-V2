import type { InputHTMLAttributes } from "react"

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
}

export default function Input({ label, ...props }: InputProps) {
  return (
    <div>
      <label className="text-sm font-medium text-brand-dark">{label}</label>
      <input
        {...props}
        className={`mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-light ${props.className ?? ""}`}
      />
    </div>
  )
}