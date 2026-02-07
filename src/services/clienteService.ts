import { api } from "./api"

export type ClienteResponse = {
  idCliente: number
  nome: string
  cpfCnpj: string
  dataNascimento: string
  email: string
  telefone: string
  ativo: boolean
}

export type ClientePayload = {
  nome: string
  cpfCnpj: string
  dataNascimento: string
  email: string
  telefone: string
}

export type ClienteUpdatePayload = Partial<ClientePayload>

export async function listarClientes() {
  const { data } = await api.get<ClienteResponse[]>("/api/clientes")
  return data
}

export async function criarCliente(payload: ClientePayload) {
  const { data } = await api.post<ClienteResponse>("/api/clientes", payload)
  return data
}

export async function atualizarCliente(id: number, payload: ClienteUpdatePayload) {
  const { data } = await api.put<ClienteResponse>(
    `/api/clientes/${id}`,
    payload
  )
  return data
}

export async function desativarCliente(id: number) {
  await api.post(`/api/clientes/${id}/desativar`)
}