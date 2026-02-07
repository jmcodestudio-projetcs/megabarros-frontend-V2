import { useEffect, useState } from "react"
import MainLayout from "../layouts/MainLayout"
import ConfirmModal from "../components/ui/ConfirmModal"
import {
  atualizarCliente,
  criarCliente,
  desativarCliente,
  listarClientes,
  type ClientePayload,
  type ClienteResponse,
} from "../services/clienteService"
import { getAuth } from "../services/tokenStorage"

const initialForm: ClientePayload = {
  nome: "",
  cpfCnpj: "",
  dataNascimento: "",
  email: "",
  telefone: "",
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "")
}

function maskCpfCnpj(value: string) {
  const digits = onlyDigits(value).slice(0, 14)

  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4")
  }

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5")
}

function maskPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11)

  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/^(\d{2})\s(\d{4})(\d)/, "($1) $2-$3")
  }

  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/^(\d{2})\s(\d{5})(\d)/, "($1) $2-$3")
}

function isEmailValid(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isPhoneValid(phone: string) {
  const digits = onlyDigits(phone)
  return digits.length === 10 || digits.length === 11
}

function isValidCPF(cpf: string) {
  const digits = onlyDigits(cpf)
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false

  const calc = (base: string, factor: number) => {
    let total = 0
    for (const char of base) {
      total += parseInt(char, 10) * factor--
    }
    const mod = (total * 10) % 11
    return mod === 10 ? 0 : mod
  }

  const d1 = calc(digits.slice(0, 9), 10)
  const d2 = calc(digits.slice(0, 10), 11)

  return d1 === parseInt(digits[9], 10) && d2 === parseInt(digits[10], 10)
}

function isValidCNPJ(cnpj: string) {
  const digits = onlyDigits(cnpj)
  if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) return false

  const calc = (base: string, factors: number[]) => {
    const total = base
      .split("")
      .reduce((sum, digit, idx) => sum + parseInt(digit, 10) * factors[idx], 0)
    const mod = total % 11
    return mod < 2 ? 0 : 11 - mod
  }

  const factors1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const factors2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

  const d1 = calc(digits.slice(0, 12), factors1)
  const d2 = calc(digits.slice(0, 13), factors2)

  return d1 === parseInt(digits[12], 10) && d2 === parseInt(digits[13], 10)
}

function isValidCpfCnpj(value: string) {
  const digits = onlyDigits(value)
  if (digits.length === 11) return isValidCPF(digits)
  if (digits.length === 14) return isValidCNPJ(digits)
  return false
}

export default function Clientes() {
  const [clientes, setClientes] = useState<ClienteResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [form, setForm] = useState<ClientePayload>(initialForm)

  const [fieldErrors, setFieldErrors] = useState({
    nome: "",
    cpfCnpj: "",
    dataNascimento: "",
    email: "",
    telefone: "",
  })

  const [editId, setEditId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<ClientePayload>(initialForm)
  const [editErrors, setEditErrors] = useState({
    nome: "",
    cpfCnpj: "",
    dataNascimento: "",
    email: "",
    telefone: "",
  })

  const [isSaving, setIsSaving] = useState(false)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [deactivatingId, setDeactivatingId] = useState<number | null>(null)

  const [modal, setModal] = useState<{
    open: boolean
    title: string
    message: string
    onConfirm: () => void
  }>({
    open: false,
    title: "",
    message: "",
    onConfirm: () => {},
  })

  const [searchTerm, setSearchTerm] = useState("")
  const [page, setPage] = useState(1)
  const pageSize = 10

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const searchDigits = onlyDigits(searchTerm)

  const filteredClientes = clientes.filter((c) => {
    const nameMatch = c.nome.toLowerCase().includes(normalizedSearch)
    const cpfMatch = searchDigits
      ? onlyDigits(c.cpfCnpj).includes(searchDigits)
      : false
    return normalizedSearch ? nameMatch || cpfMatch : true
  })

  const sortedClientes = [...filteredClientes].sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR")
  )

  const totalPages = Math.max(1, Math.ceil(sortedClientes.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paginatedClientes = sortedClientes.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  useEffect(() => {
    setPage(1)
  }, [searchTerm])

  const role = getAuth()?.role
  const canCreate = role !== "CORRETOR"
  const canEditAll = role !== "CORRETOR"
  const canDeactivate = role !== "CORRETOR"

  function showSuccess(msg: string) {
    setSuccess(msg)
    setTimeout(() => setSuccess(""), 3000)
  }

  async function carregar() {
    setError("")
    setLoading(true)
    try {
      const data = await listarClientes()
      setClientes(data)
    } catch {
      setError("Não foi possível carregar os clientes.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  function validateCreate(payload: ClientePayload) {
    const errors = {
      nome: "",
      cpfCnpj: "",
      dataNascimento: "",
      email: "",
      telefone: "",
    }

    if (!payload.nome.trim()) {
      errors.nome = "Informe o nome."
    } else if (payload.nome.length > 150) {
      errors.nome = "Máximo de 150 caracteres."
    }

    if (!payload.cpfCnpj.trim()) {
      errors.cpfCnpj = "Informe o CPF/CNPJ."
    } else if (!isValidCpfCnpj(payload.cpfCnpj)) {
      errors.cpfCnpj = "CPF/CNPJ inválido."
    } else if (payload.cpfCnpj.length > 20) {
      errors.cpfCnpj = "Máximo de 20 caracteres."
    }

    if (!payload.dataNascimento) {
      errors.dataNascimento = "Informe a data de nascimento."
    }

    if (!payload.email.trim()) {
      errors.email = "Informe o e-mail."
    } else if (!isEmailValid(payload.email)) {
      errors.email = "E-mail inválido."
    } else if (payload.email.length > 150) {
      errors.email = "Máximo de 150 caracteres."
    }

    if (!payload.telefone.trim()) {
      errors.telefone = "Informe o telefone."
    } else if (!isPhoneValid(payload.telefone)) {
      errors.telefone = "Telefone deve ter 10 ou 11 dígitos."
    } else if (payload.telefone.length > 30) {
      errors.telefone = "Máximo de 30 caracteres."
    }

    return errors
  }

  function validateUpdate(payload: ClientePayload) {
    const errors = {
      nome: "",
      cpfCnpj: "",
      dataNascimento: "",
      email: "",
      telefone: "",
    }

    if (payload.nome && payload.nome.length > 150) {
      errors.nome = "Máximo de 150 caracteres."
    }

    if (payload.cpfCnpj) {
      if (!isValidCpfCnpj(payload.cpfCnpj)) {
        errors.cpfCnpj = "CPF/CNPJ inválido."
      }
      if (payload.cpfCnpj.length > 20) {
        errors.cpfCnpj = "Máximo de 20 caracteres."
      }
    }

    if (payload.email && !isEmailValid(payload.email)) {
      errors.email = "E-mail inválido."
    } else if (payload.email && payload.email.length > 150) {
      errors.email = "Máximo de 150 caracteres."
    }

    if (payload.telefone && !isPhoneValid(payload.telefone)) {
      errors.telefone = "Telefone deve ter 10 ou 11 dígitos."
    } else if (payload.telefone && payload.telefone.length > 30) {
      errors.telefone = "Máximo de 30 caracteres."
    }

    return errors
  }

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    const errors = validateCreate(form)
    setFieldErrors(errors)
    if (Object.values(errors).some((e) => e)) return

    try {
      setIsSaving(true)
      const created = await criarCliente(form)
      setClientes((prev) => [...prev, created])
      setForm(initialForm)
      showSuccess("Cliente cadastrado com sucesso.")
    } catch {
      setError("Erro ao cadastrar cliente.")
    } finally {
      setIsSaving(false)
    }
  }

  function iniciarEdicao(c: ClienteResponse) {
    setEditId(c.idCliente)
    setEditForm({
      nome: c.nome,
      cpfCnpj: c.cpfCnpj,
      dataNascimento: c.dataNascimento,
      email: c.email,
      telefone: c.telefone,
    })
    setEditErrors({
      nome: "",
      cpfCnpj: "",
      dataNascimento: "",
      email: "",
      telefone: "",
    })
  }

  async function salvarEdicao(id: number) {
    const errors = validateUpdate(editForm)
    setEditErrors(errors)
    if (Object.values(errors).some((e) => e)) return

    try {
      setUpdatingId(id)
      const updated = await atualizarCliente(id, editForm)
      setClientes((prev) =>
        prev.map((c) => (c.idCliente === id ? updated : c))
      )
      setEditId(null)
      showSuccess("Cliente atualizado com sucesso.")
    } catch {
      setError("Erro ao atualizar cliente.")
    } finally {
      setUpdatingId(null)
    }
  }

  function abrirModalDesativar(id: number) {
    setModal({
      open: true,
      title: "Desativar cliente",
      message: "Deseja desativar este cliente? Esta ação não poderá ser desfeita.",
      onConfirm: async () => {
        try {
          setDeactivatingId(id)
          await desativarCliente(id)
          setClientes((prev) =>
            prev.map((c) =>
              c.idCliente === id ? { ...c, ativo: false } : c
            )
          )
          showSuccess("Cliente desativado com sucesso.")
        } catch {
          setError("Erro ao desativar cliente.")
        } finally {
          setDeactivatingId(null)
          setModal((prev) => ({ ...prev, open: false }))
        }
      },
    })
  }

  return (
    <MainLayout title="Clientes">
      {canCreate && (
        <div className="bg-white rounded-2xl shadow p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-brand-dark">Novo Cliente</h2>

          <form
            className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4"
            onSubmit={handleCriar}
          >
            <div>
              <label className="text-sm font-medium text-brand-dark">Nome</label>
              <input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className={`mt-1 w-full rounded-lg border px-3 py-2 ${
                  fieldErrors.nome ? "border-red-400" : "border-gray-300"
                }`}
              />
              {fieldErrors.nome && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.nome}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-brand-dark">
                CPF/CNPJ
              </label>
              <input
                value={form.cpfCnpj}
                onChange={(e) =>
                  setForm({ ...form, cpfCnpj: maskCpfCnpj(e.target.value) })
                }
                className={`mt-1 w-full rounded-lg border px-3 py-2 ${
                  fieldErrors.cpfCnpj ? "border-red-400" : "border-gray-300"
                }`}
              />
              {fieldErrors.cpfCnpj && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.cpfCnpj}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-brand-dark">
                Data de nascimento
              </label>
              <input
                type="date"
                value={form.dataNascimento}
                onChange={(e) =>
                  setForm({ ...form, dataNascimento: e.target.value })
                }
                className={`mt-1 w-full rounded-lg border px-3 py-2 ${
                  fieldErrors.dataNascimento ? "border-red-400" : "border-gray-300"
                }`}
              />
              {fieldErrors.dataNascimento && (
                <p className="text-xs text-red-600 mt-1">
                  {fieldErrors.dataNascimento}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-brand-dark">Email</label>
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={`mt-1 w-full rounded-lg border px-3 py-2 ${
                  fieldErrors.email ? "border-red-400" : "border-gray-300"
                }`}
              />
              {fieldErrors.email && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-brand-dark">Telefone</label>
              <input
                value={form.telefone}
                onChange={(e) =>
                  setForm({ ...form, telefone: maskPhone(e.target.value) })
                }
                className={`mt-1 w-full rounded-lg border px-3 py-2 ${
                  fieldErrors.telefone ? "border-red-400" : "border-gray-300"
                }`}
              />
              {fieldErrors.telefone && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.telefone}</p>
              )}
            </div>

            <div>
              <button
                className="rounded-lg bg-brand-dark text-white px-4 py-2 hover:bg-brand-light transition disabled:opacity-70"
                disabled={isSaving}
              >
                {isSaving ? "Salvando..." : "➕ Cadastrar cliente"}
              </button>
            </div>
          </form>
        </div>
      )}

      {error && (
        <div className="mt-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          {success}
        </div>
      )}

      <div className="mt-8 bg-white rounded-2xl shadow p-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-brand-dark">Clientes</h2>
            <span className="text-xs text-gray-500">
              {sortedClientes.length} resultado(s)
            </span>
          </div>

          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou CPF/CNPJ"
            className="w-full sm:w-80 rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>

        {loading ? (
          <p className="mt-2 text-sm text-gray-500">Carregando...</p>
        ) : (
          <>
            {sortedClientes.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">
                Nenhum cliente encontrado.
              </p>
            ) : (
              <>
                {/* Mobile collapse */}
                <div className="mt-4 md:hidden space-y-3">
                  {paginatedClientes.map((c) => {
                    const isEditing = editId === c.idCliente

                    return (
                      <div
                        key={c.idCliente}
                        className="border rounded-lg p-4 bg-brand-gray"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-brand-dark">
                              {c.nome}
                            </p>
                            <p className="text-xs text-gray-500">
                              {c.cpfCnpj}
                            </p>
                          </div>

                          <div className="flex gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => salvarEdicao(c.idCliente)}
                                  className="text-xs px-2 py-1 rounded bg-brand-dark text-white disabled:opacity-70"
                                  disabled={updatingId === c.idCliente}
                                >
                                  {updatingId === c.idCliente
                                    ? "Salvando..."
                                    : "💾 Salvar"}
                                </button>
                                <button
                                  onClick={() => setEditId(null)}
                                  className="text-xs px-2 py-1 rounded border border-gray-300"
                                >
                                  Cancelar
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => iniciarEdicao(c)}
                                  className="text-xs px-2 py-1 rounded border border-gray-300"
                                >
                                  ✏️ Editar
                                </button>
                                {canDeactivate && c.ativo && (
                                  <button
                                    onClick={() => abrirModalDesativar(c.idCliente)}
                                    className="text-xs px-2 py-1 rounded bg-red-600 text-white"
                                  >
                                    🚫 Desativar
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="mt-3 grid grid-cols-1 gap-3">
                            <div>
                              <label className="text-sm font-medium text-brand-dark">
                                Nome
                              </label>
                              <input
                                value={editForm.nome}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    nome: e.target.value,
                                  })
                                }
                                disabled={!canEditAll}
                                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 disabled:opacity-60"
                              />
                            </div>

                            <div>
                              <label className="text-sm font-medium text-brand-dark">
                                CPF/CNPJ
                              </label>
                              <input
                                value={editForm.cpfCnpj}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    cpfCnpj: maskCpfCnpj(e.target.value),
                                  })
                                }
                                disabled={!canEditAll}
                                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 disabled:opacity-60"
                              />
                            </div>

                            <div>
                              <label className="text-sm font-medium text-brand-dark">
                                Email
                              </label>
                              <input
                                value={editForm.email}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, email: e.target.value })
                                }
                                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                              />
                            </div>

                            <div>
                              <label className="text-sm font-medium text-brand-dark">
                                Telefone
                              </label>
                              <input
                                value={editForm.telefone}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    telefone: maskPhone(e.target.value),
                                  })
                                }
                                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                              />
                            </div>
                          </div>
                        ) : (
                          <details className="mt-3 text-sm text-gray-600">
                            <summary className="cursor-pointer">Detalhes</summary>
                            <div className="mt-2 grid gap-1">
                              <span>Email: {c.email}</span>
                              <span>Telefone: {c.telefone}</span>
                              <span>Status: {c.ativo ? "Ativo" : "Inativo"}</span>
                            </div>
                          </details>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Desktop table */}
                <div className="mt-4 hidden md:block overflow-x-auto">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead className="text-left text-gray-500 border-b">
                      <tr>
                        <th className="py-2 pr-4">Nome</th>
                        <th className="py-2 pr-4">CPF/CNPJ</th>
                        <th className="py-2 pr-4">Email</th>
                        <th className="py-2 pr-4">Telefone</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {paginatedClientes.map((c) => {
                        const isEditing = editId === c.idCliente

                        return (
                          <tr key={c.idCliente}>
                            <td className="py-2 pr-4 font-semibold text-brand-dark">
                              {c.nome}
                            </td>
                            <td className="py-2 pr-4">{c.cpfCnpj}</td>
                            <td className="py-2 pr-4">{c.email}</td>
                            <td className="py-2 pr-4">{c.telefone}</td>
                            <td className="py-2 pr-4">
                              <span
                                className={`px-2 py-1 rounded text-xs ${
                                  c.ativo
                                    ? "bg-green-50 text-green-700"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {c.ativo ? "Ativo" : "Inativo"}
                              </span>
                            </td>
                            <td className="py-2 pr-4">
                              <div className="flex gap-2">
                                {isEditing ? (
                                  <>
                                    <button
                                      onClick={() => salvarEdicao(c.idCliente)}
                                      className="text-xs px-2 py-1 rounded bg-brand-dark text-white disabled:opacity-70"
                                      disabled={updatingId === c.idCliente}
                                    >
                                      {updatingId === c.idCliente
                                        ? "Salvando..."
                                        : "💾 Salvar"}
                                    </button>
                                    <button
                                      onClick={() => setEditId(null)}
                                      className="text-xs px-2 py-1 rounded border border-gray-300"
                                    >
                                      Cancelar
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => iniciarEdicao(c)}
                                      className="text-xs px-2 py-1 rounded border border-gray-300"
                                    >
                                      ✏️ Editar
                                    </button>
                                    {canDeactivate && c.ativo && (
                                      <button
                                        onClick={() => abrirModalDesativar(c.idCliente)}
                                        className="text-xs px-2 py-1 rounded bg-red-600 text-white"
                                      >
                                        🚫 Desativar
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    Página {currentPage} de {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1 rounded border border-gray-300"
                      disabled={currentPage === 1}
                    >
                      ← Anterior
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="px-3 py-1 rounded border border-gray-300"
                      disabled={currentPage === totalPages}
                    >
                      Próxima →
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <ConfirmModal
        open={modal.open}
        title={modal.title}
        message={modal.message}
        onConfirm={modal.onConfirm}
        onCancel={() => setModal((prev) => ({ ...prev, open: false }))}
        loading={deactivatingId !== null}
      />
    </MainLayout>
  )
}