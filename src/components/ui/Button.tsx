import type { ButtonHTMLAttributes } from "react"

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost"
}

export default function Button({
  variant = "primary",
  className,
  ...props
}: ButtonProps) {
  const base = "w-full rounded-lg py-2 font-semibold transition"
  const styles =
    variant === "primary"
      ? "bg-brand-dark text-white hover:bg-brand-light"
      : "text-brand-dark hover:text-brand-light"

  return <button {...props} className={`${base} ${styles} ${className ?? ""}`} />
}