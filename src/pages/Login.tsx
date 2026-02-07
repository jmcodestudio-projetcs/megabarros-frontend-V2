import { useState } from "react"
import { useNavigate } from "react-router-dom"
import AuthLayout from "../layouts/AuthLayout"
import Input from "../components/ui/Input"
import Button from "../components/ui/Button"
import { login } from "../services/authService"
import { saveAuth } from "../services/tokenStorage"

export default function Login() {
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const data = await login(email, senha)
      saveAuth(data)
      navigate("/dashboard")
    } catch (err) {
      setError("E-mail ou senha inválidos" + err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          label="E-mail"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          label="Senha"
          type="password"
          placeholder="********"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
        />

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <Button type="submit" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </Button>

        <div className="text-center">
          <Button type="button" variant="ghost" className="w-auto">
            Esqueci minha senha
          </Button>
        </div>
      </form>
    </AuthLayout>
  )
}