import { api } from "./api"
import type { ClienteResponse } from "./clienteService"

export type CorretorResponse = {
  idCorretor: number
  idUsuario: number | null
  nomeCorretor: string
  corretora?: string | null
  cpfCnpj?: string | null
  susepPj?: string | null
  susepPf?: string | null
  email?: string | null
  telefone?: string | null
  uf?: string | null
  dataNascimento?: string | null
  doc?: string | null
  dataCriacao: string
}

export type CorretorPayload = {
  idUsuario: number | null
  nomeCorretor: string
  corretora?: string
  cpfCnpj?: string
  susepPj?: string
  susepPf?: string
  email?: string
  telefone?: string
  uf?: string
  dataNascimento?: string
  doc?: string
}

export async function listarCorretores() {
  const { data } = await api.get<CorretorResponse[]>("/api/corretores")
  return data
}

export async function listarMeusClientes() {
  const { data } = await api.get<ClienteResponse[]>("/api/corretores/me/clientes")
  return data
}

export async function criarCorretor(payload: CorretorPayload) {
  const { data } = await api.post<CorretorResponse>("/api/corretores", payload)
  return data
}

export async function atualizarCorretor(id: number, payload: CorretorPayload) {
  const { data } = await api.put<CorretorResponse>(
    `/api/corretores/${id}`,
    payload
  )
  return data
}

export async function excluirCorretor(id: number) {
  await api.delete(`/api/corretores/${id}`)
}